import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
dotenv.config({path:fileURLToPath(new URL('../.env',import.meta.url)),quiet:true});
process.env.NODE_ENV='test';
process.env.JWT_ACCESS_SECRET=randomUUID()+randomUUID();
process.env.JWT_REFRESH_SECRET=randomUUID()+randomUUID();
const dbName='codex_audit_w07_'+Date.now();
const results=[];
const check=(name,pass)=>{results.push({name,pass:Boolean(pass)});console.log(`${pass?'PASS':'FAIL'} ${name}`)};
let server,base;
class Session{
 cookies=new Map();
 async request(method,path,body){
  const headers={};if(this.cookies.size)headers.Cookie=[...this.cookies].map(([k,v])=>`${k}=${v}`).join('; ');
  if(body!==undefined)headers['Content-Type']='application/json';
  const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  for(const raw of response.headers.getSetCookie()){const [pair]=raw.split(';');const at=pair.indexOf('=');if(pair.slice(at+1))this.cookies.set(pair.slice(0,at),pair.slice(at+1));else this.cookies.delete(pair.slice(0,at));}
  return {status:response.status,data:await response.json()};
 }
}
try{
 await mongoose.connect(process.env.MONGODB_URI,{dbName,serverSelectionTimeoutMS:10000});
 if(mongoose.connection.name!==dbName)throw Error('ISOLATION_CHECK_FAILED');
 const {app}=await import('../dist/app.js');
 const {UserModel}=await import('../dist/modules/users/user.model.js');
 const {OrderModel,ORDER_STATUSES,PAYMENT_STATUSES}=await import('../dist/modules/orders/order.model.js');
 const {ProductModel}=await import('../dist/modules/products/product.model.js');
 const {AdminGuardModel}=await import('../dist/modules/users/admin-guard.model.js');
 const {updateUser,deleteUser}=await import('../dist/modules/users/users.service.js');
 await Promise.all([UserModel.init(),OrderModel.init(),AdminGuardModel.init()]);
 const password=randomUUID(),hash=await bcrypt.hash(password,4);
 const [admin,customer]=await UserModel.create([
  {name:'Test Admin',email:'admin@audit.invalid',password:hash,role:'admin'},
  {name:'Test Customer',email:'customer@audit.invalid',password:hash,role:'customer'},
 ]);
 server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))});
 base=`http://127.0.0.1:${server.address().port}`;
 const anon=new Session(),a=new Session(),c=new Session();
 await a.request('POST','/api/auth/login',{email:admin.email,password});
 await c.request('POST','/api/auth/customer/login',{email:customer.email,password});
 for(const path of ['/api/admin/dashboard/summary','/api/admin/users','/api/admin/orders']){
  check('anonymous cannot read '+path,(await anon.request('GET',path)).status===401);
  check('customer cannot read '+path,(await c.request('GET',path)).status===401);
 }
 for(const payload of [{status:'blocked'},{role:'customer'}])check('self role/status protection '+Object.keys(payload)[0],(await a.request('PATCH','/api/admin/users/'+admin.id,payload)).status===409);
 check('self delete protection',(await a.request('DELETE','/api/admin/users/'+admin.id)).status===409);
 for(const payload of [{status:'blocked'},{role:'customer'}]){
  try{await updateUser(admin.id,customer.id,payload);check('last admin guard '+Object.keys(payload)[0],false)}catch(e){check('last admin guard '+Object.keys(payload)[0],e.code==='LAST_ACTIVE_ADMIN')}
 }
 try{await deleteUser(admin.id,customer.id);check('last admin deletion guard',false)}catch(e){check('last admin deletion guard',e.code==='LAST_ACTIVE_ADMIN')}
 let r=await a.request('PATCH','/api/admin/users/'+customer.id,{status:'blocked'});
 check('block customer and invalidate current session',r.status===200&&(await c.request('GET','/api/auth/customer/me')).status===401);
 check('blocked customer refresh denied',(await c.request('POST','/api/auth/customer/refresh')).status===401);
 r=await a.request('PATCH','/api/admin/users/'+customer.id,{status:'active'});check('unblock customer',r.status===200);
 r=await a.request('DELETE','/api/admin/users/'+customer.id);check('soft delete customer',r.status===200&&(await a.request('GET','/api/admin/users/'+customer.id)).status===404);
 r=await a.request('GET','/api/admin/users');check('users do not expose secrets',r.status===200&&r.data.data.users.every(u=>!('password'in u)&&!('refreshTokenHash'in u)));
 // Exercise concurrent removals below the HTTP boundary to target the invariant
 // independently of request authentication timing.
 const secondAdmin=await UserModel.create({name:'Second Admin',email:'second@audit.invalid',password:hash,role:'admin'});
 const removals=await Promise.allSettled([updateUser(admin.id,secondAdmin.id,{status:'blocked'}),updateUser(secondAdmin.id,admin.id,{role:'customer'})]);
 check('concurrent mutations retain an active admin',removals.filter(x=>x.status==='fulfilled').length===1&&await UserModel.countDocuments({role:'admin',status:'active',deletedAt:null})===1);
 await UserModel.updateOne({_id:admin._id},{$set:{role:'admin',status:'active'}});
 await UserModel.updateOne({_id:secondAdmin._id},{$set:{role:'customer',status:'blocked'}});
 const fixture=async(status='pending',paymentStatus='unpaid',paymentMethod='cod',extra={})=>OrderModel.create({
  orderCode:'TEST-'+randomUUID(),source:'checkout',customer:{fullName:'Test Buyer',phone:'0901234567'},
  shippingAddress:{addressLine:'Test address'},items:[{product:new mongoose.Types.ObjectId(),sku:'TEST-SKU',productName:'Test Product',unitPrice:100000,quantity:1,lineTotal:100000}],
  subtotal:100000,total:100000,status,paymentStatus,paymentMethod,...extra,
 });
 const transitions={pending:['confirmed','cancelled'],confirmed:['processing','cancelled'],processing:['shipping','cancelled'],shipping:['completed'],completed:[],cancelled:[]};
 for(const from of ORDER_STATUSES)for(const to of ORDER_STATUSES){
  const order=await fixture(from);
  const response=await a.request('PATCH',`/api/admin/orders/${order.id}/status`,{status:to,note:'Test transition'});
  const allowed=from===to||transitions[from].includes(to);
  check(`order matrix ${from} -> ${to}`,response.status===(allowed?200:409));
  const saved=await OrderModel.findById(order._id).lean();
  check(`order history ${from} -> ${to}`,saved.status===(allowed?to:from)&&saved.statusHistory.length===(allowed&&from!==to?1:0));
 }
 const payTransitions={unpaid:['pending','paid','failed'],pending:['paid','failed'],paid:['refunded'],failed:['pending','paid'],refunded:[]};
 for(const from of PAYMENT_STATUSES)for(const to of PAYMENT_STATUSES){
  const order=await fixture('completed',from);
  const response=await a.request('PATCH',`/api/admin/orders/${order.id}/payment-status`,{paymentStatus:to,note:'Test payment'});
  const allowed=from===to||payTransitions[from].includes(to);
  check(`payment matrix ${from} -> ${to}`,response.status===(allowed?200:409));
  const saved=await OrderModel.findById(order._id).lean();
  check(`payment history ${from} -> ${to}`,saved.paymentStatus===(allowed?to:from)&&saved.paymentHistory.length===(allowed&&from!==to?1:0));
 }
 let order=await fixture();
 check('cancellation requires reason',(await a.request('PATCH',`/api/admin/orders/${order.id}/status`,{status:'cancelled'})).status===400);
 order=await fixture('shipping','unpaid','bank_transfer');
 check('unpaid bank transfer cannot complete',(await a.request('PATCH',`/api/admin/orders/${order.id}/status`,{status:'completed'})).status===409);
 order=await fixture('shipping','refunded');
 check('refunded COD cannot become paid on completion',(await a.request('PATCH',`/api/admin/orders/${order.id}/status`,{status:'completed'})).status===409);
 order=await fixture('cancelled');
 check('cancelled order cannot be marked paid',(await a.request('PATCH',`/api/admin/orders/${order.id}/payment-status`,{paymentStatus:'paid'})).status===409);
 order=await fixture('processing','paid');
 check('shipping workflow must end or cancel before refund',(await a.request('PATCH',`/api/admin/orders/${order.id}/payment-status`,{paymentStatus:'refunded'})).status===409);
 order=await fixture('shipping');
 r=await a.request('PATCH',`/api/admin/orders/${order.id}/status`,{status:'completed'});
 check('COD completion updates payment and both histories atomically',r.status===200&&r.data.data.order.paymentStatus==='paid'&&r.data.data.order.statusHistory.length===1&&r.data.data.order.paymentHistory.length===1&&r.data.data.order.paymentHistory[0].changedBy===admin.id);
 await a.request('PATCH',`/api/admin/orders/${order.id}/status`,{status:'completed'});
 check('repeat completion does not duplicate history',(await OrderModel.findById(order._id)).paymentHistory.length===1);
 order=await fixture();
 await Promise.all(['confirmed','cancelled'].map(status=>a.request('PATCH',`/api/admin/orders/${order.id}/status`,{status,note:'Concurrent test'})));
 const concurrent=await OrderModel.findById(order._id).lean();
 check('concurrent order writes keep a continuous history',concurrent.statusHistory.length>=1&&concurrent.statusHistory[0].from==='pending'&&concurrent.statusHistory.every((h,i)=>i===0||h.from===concurrent.statusHistory[i-1].to)&&concurrent.status===concurrent.statusHistory.at(-1).to);
 const demo=await fixture('completed','paid','cod',{source:'demo',total:90000000});
 const legacyDemo=await fixture('completed','paid','cod',{orderCode:'DH-DEMO-TEST',source:'legacy',total:80000000});
 for(const sample of [demo,legacyDemo]){
  r=await a.request('GET','/api/admin/orders/'+sample.id);check('demo source label '+sample.orderCode,r.status===200&&r.data.data.order.source==='demo');
 }
 const realOrders=await OrderModel.find({source:{$ne:'demo'},orderCode:{$not:/^DH-DEMO-/}}).lean();
 r=await a.request('GET','/api/admin/dashboard/summary');
 check('dashboard excludes seeded orders and revenue',r.status===200&&r.data.data.orders===realOrders.length&&r.data.data.revenue===realOrders.filter(o=>o.status==='completed'&&o.paymentStatus==='paid').reduce((sum,o)=>sum+o.total,0));
 check('dashboard excludes deleted customers',r.data.data.customers===await UserModel.countDocuments({role:'customer',deletedAt:null}));
 await ProductModel.collection.insertMany([{status:'active',variants:[{stock:2}]},{status:'active',variants:[{stock:10}]},{status:'inactive',variants:[{stock:0}]},{status:'active',deletedAt:new Date(),variants:[{stock:0}]}].map((p,index)=>({...p,slug:'dashboard-test-'+index,variants:p.variants.map(v=>({...v,sku:'DASHBOARD-'+index}))})));
 r=await a.request('GET','/api/admin/dashboard/summary');check('dashboard product and low stock counts',r.data.data.products===3&&r.data.data.lowStock===1);
 r=await a.request('GET','/api/admin/orders?dateFrom=2026-11-10&dateTo=2026-11-01');check('reversed date range rejected',r.status===400);
 r=await a.request('GET','/api/admin/orders?search=DH-DEMO-TEST');check('search and pagination contract',r.status===200&&r.data.data.orders.length===1&&r.data.data.pagination.total===1);
 check('invalid order ID rejected',(await a.request('GET','/api/admin/orders/invalid')).status===400);
 check('missing order returns 404',(await a.request('GET','/api/admin/orders/'+new mongoose.Types.ObjectId())).status===404);
}catch(error){console.log('TEST_BLOCKED',error.code??error.name);check('execution completed',false);process.exitCode=1;}
finally{
 if(server)await new Promise(resolve=>server.close(resolve));
 if(mongoose.connection.readyState===1){
  if(!/^codex_audit_w07_\d+$/.test(dbName)||mongoose.connection.name!==dbName)throw Error('CLEANUP_ISOLATION_CHECK_FAILED');
  try{await mongoose.connection.db.dropDatabase()}catch{for(const collection of await mongoose.connection.db.collections())await collection.deleteMany({})}
 }
 await mongoose.disconnect();
 await fs.mkdir(new URL('../../.tmp_baocao/',import.meta.url),{recursive:true});
 await fs.writeFile(new URL('../../.tmp_baocao/week07-api-results.json',import.meta.url),JSON.stringify({isolatedDatabase:true,results},null,2));
 console.log('RESULT',results.length,'PASS',results.filter(x=>x.pass).length,'FAIL',results.filter(x=>!x.pass).length);
 if(results.some(x=>!x.pass))process.exitCode=1;
}
