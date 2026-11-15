import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
dotenv.config({path:fileURLToPath(new URL('../.env',import.meta.url)),quiet:true});
process.env.NODE_ENV='test';
process.env.JWT_ACCESS_SECRET=randomUUID()+randomUUID();
process.env.JWT_REFRESH_SECRET=randomUUID()+randomUUID();
const dbName='codex_audit_w08_'+Date.now();
const results=[];
const check=(name,pass)=>{results.push({name,pass:Boolean(pass)});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
let server,base;
class Session {
  cookies=new Map();
  clone(){const copy=new Session();copy.cookies=new Map(this.cookies);return copy;}
  async request(method,path,body){
    const headers={};
    if(this.cookies.size)headers.Cookie=[...this.cookies].map(([key,value])=>`${key}=${value}`).join('; ');
    if(body!==undefined)headers['Content-Type']='application/json';
    const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    const setCookies=response.headers.getSetCookie();
    for(const raw of setCookies){const pair=raw.split(';')[0],at=pair.indexOf('=');if(pair.slice(at+1))this.cookies.set(pair.slice(0,at),pair.slice(at+1));else this.cookies.delete(pair.slice(0,at));}
    return {status:response.status,data:await response.json(),setCookies,cacheControl:response.headers.get('cache-control')};
  }
}
try {
  const {buildRagDocument,ragDocumentSchema,planRagSync}=await import('../dist/modules/rag/rag-document.js');
  const sample={id:'000000000000000000000001',slug:'sample',name:'Vợt thử nghiệm',
    categoryId:'000000000000000000000002',brandId:'000000000000000000000003',
    categorySlug:'vot',brandSlug:'brand',categoryName:'Vợt',brandName:'Brand',
    basePrice:100000,salePrice:null,effectivePrice:100000,totalStock:10,primaryImage:null,updatedAt:new Date(),
    shortDescription:'Dễ chơi',description:'Mô tả sản phẩm',
    specifications:[{key:'weight',label:'Khối lượng',value:83,unit:'g'},{key:'flex',label:'Độ dẻo',value:'Dẻo',unit:''}],
    variants:[{id:'v1',sku:'SKU-1',colorName:'Đen',colorHex:'#000000',attributes:[],price:null,salePrice:null,effectivePrice:100000,stock:10,imageUrl:''}]};
  const doc=buildRagDocument(sample);
  await fs.mkdir(new URL('../../docs/evidence/',import.meta.url),{recursive:true});
  await fs.writeFile(new URL('../../docs/evidence/week08-rag-document.example.json',import.meta.url),JSON.stringify(doc,null,2)+'\n');
  check('RAG valid schema, stable identity and no claimed embedding',ragDocumentSchema.safeParse(doc).success&&doc.documentId==='product:'+sample.id&&doc.indexedAt===null);
  check('RAG rejects forged hash and unknown fields',!ragDocumentSchema.safeParse({...doc,contentVersion:'a'.repeat(64)}).success&&!ragDocumentSchema.safeParse({...doc,price:100}).success);
  check('RAG excludes live prices, stock and updated timestamp',!doc.content.includes('100000')&&!doc.content.includes('Tồn kho')&&!doc.content.includes('Cập nhật lúc'));
  const changedLive={...sample,basePrice:900000,effectivePrice:900000,totalStock:0,updatedAt:new Date(0),primaryImage:{url:'/new.png'},variants:sample.variants.map(v=>({...v,stock:0,effectivePrice:900000}))};
  check('RAG live-only edits preserve contentVersion',buildRagDocument(changedLive).contentVersion===doc.contentVersion);
  check('RAG array order does not change contentVersion',buildRagDocument({...sample,specifications:[...sample.specifications].reverse()}).contentVersion===doc.contentVersion);
  check('RAG semantic edits change contentVersion',buildRagDocument({...sample,description:'Mô tả mới'}).contentVersion!==doc.contentVersion);
  check('RAG category reference edit changes version',buildRagDocument({...sample,categoryId:'000000000000000000000004'}).contentVersion!==doc.contentVersion);
  check('RAG rejects incomplete embedding metadata',!ragDocumentSchema.safeParse({...doc,indexedAt:new Date().toISOString()}).success);
  check('RAG new document schedules embedding',planRagSync([sample]).actions[0].requiresEmbedding);
  check('RAG repeated snapshot is idempotent',planRagSync([sample],[doc]).actions[0].action==='noop');
  check('RAG semantic edit schedules reindex',planRagSync([{...sample,name:'Tên mới'}],[doc]).actions[0].reason==='content_changed');
  const slugAction=planRagSync([{...sample,slug:'new-slug'}],[doc]).actions[0];
  check('RAG slug edit updates metadata without embedding',slugAction.reason==='metadata_changed'&&!slugAction.requiresEmbedding);
  const inactive=planRagSync([],[doc]);
  check('RAG absent public product deactivates document',inactive.documents[0].status==='inactive'&&inactive.actions[0].action==='deactivate');
  check('RAG inactive repeated snapshot is idempotent',planRagSync([],inactive.documents).actions[0].action==='noop');
  check('RAG active again schedules fresh embedding',planRagSync([sample],inactive.documents).actions[0].reason==='reactivated');
  let duplicatesRejected=false;try{planRagSync([sample],[doc,doc]);}catch{duplicatesRejected=true;}
  check('RAG rejects duplicate snapshot identities',duplicatesRejected);

  await mongoose.connect(process.env.MONGODB_URI,{dbName,serverSelectionTimeoutMS:10000});
  if(mongoose.connection.name!==dbName)throw Error('ISOLATION_CHECK_FAILED');
  const {app}=await import('../dist/app.js');
  const {UserModel}=await import('../dist/modules/users/user.model.js');
  const {ProductModel}=await import('../dist/modules/products/product.model.js');
  const {BrandModel}=await import('../dist/modules/brands/brand.model.js');
  const {CategoryModel}=await import('../dist/modules/categories/category.model.js');
  const {listCatalogProducts}=await import('../dist/modules/catalog/catalog.service.js');
  const {createAccessToken}=await import('../dist/modules/auth/auth.tokens.js');
  const {env}=await import('../dist/config/env.js');
  const {default:jwt}=await import('jsonwebtoken');
  await UserModel.init();
  const password='Week08Test123!';
  const admin=await UserModel.create({name:'Audit Admin',email:'admin@audit.invalid',password:await bcrypt.hash(password,4),role:'admin'});
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  base=`http://127.0.0.1:${server.address().port}`;
  const anon=new Session(),customer=new Session();
  const registration={name:'Test Customer',email:'Customer@audit.invalid',phone:'0901234567',password};
  let r=await customer.request('POST','/api/auth/customer/register',{...registration,role:'admin'});
  const userId=r.data.data?.user?.id;
  check('customer registration enforces customer role and normalizes email',r.status===201&&r.data.data?.user?.role==='customer'&&r.data.data?.user?.email==='customer@audit.invalid');
  check('customer cookies are HttpOnly and SameSite, separate from admin',r.setCookies.length===2&&r.setCookies.every(c=>c.includes('HttpOnly')&&c.includes('SameSite=Lax'))&&!customer.cookies.has('accessToken'));
  check('auth response excludes password and token hash',!('password'in r.data.data.user)&&!('refreshTokenHash'in r.data.data.user));
  r=await anon.request('POST','/api/auth/customer/register',{...registration,email:'another@audit.invalid',phone:'invalid'});
  check('registration rejects invalid phone',r.status===400);
  r=await anon.request('POST','/api/auth/customer/register',registration);
  check('registration rejects duplicate email',r.status===409);
  r=await anon.request('POST','/api/auth/customer/register',{...registration,email:'other@audit.invalid'});
  check('registration rejects duplicate phone',r.status===409);
  for(const path of ['/api/admin/users','/api/admin/orders','/api/admin/products','/api/admin/dashboard/summary']){
    check('customer cookie cannot access '+path,(await customer.request('GET',path)).status===401);
  }
  const swapped=new Session();swapped.cookies.set('accessToken',customer.cookies.get('customerAccessToken'));
  check('customer token copied into admin cookie is forbidden',(await swapped.request('GET','/api/admin/users')).status===403);
  const expired=customer.clone();expired.cookies.set('customerAccessToken',jwt.sign({role:'customer'},env.JWT_ACCESS_SECRET,{subject:userId,expiresIn:-1}));
  check('expired customer access token rejected',(await expired.request('GET','/api/auth/customer/me')).status===401);
  const first=customer.clone(),second=customer.clone();
  const rotations=await Promise.all([first.request('POST','/api/auth/customer/refresh'),second.request('POST','/api/auth/customer/refresh')]);
  check('concurrent refresh accepts token exactly once',rotations.filter(x=>x.status===200).length===1&&rotations.filter(x=>x.status===401).length===1);
  const winner=rotations[0].status===200?first:second;
  check('rotated session can read customer profile',(await winner.request('GET','/api/auth/customer/me')).status===200);
  await customer.request('POST','/api/auth/customer/logout');
  check('stale logout cannot revoke newer rotated session',(await winner.request('POST','/api/auth/customer/refresh')).status===200);
  const savedRefresh=winner.clone();
  r=await winner.request('POST','/api/auth/customer/logout');
  check('logout clears customer cookies',r.status===200&&winner.cookies.size===0);
  check('logged out refresh token is revoked',(await savedRefresh.request('POST','/api/auth/customer/refresh')).status===401);
  r=await customer.request('POST','/api/auth/customer/login',{identifier:registration.email,password});
  check('customer login by email',r.status===200);
  r=await customer.request('POST','/api/auth/customer/login',{identifier:registration.phone,password});
  check('customer login by phone',r.status===200);
  check('wrong password rejected',(await anon.request('POST','/api/auth/customer/login',{identifier:registration.email,password:'WrongPass123'})).status===401);
  check('admin cannot use customer login',(await anon.request('POST','/api/auth/customer/login',{identifier:admin.email,password})).status===403);
  await UserModel.updateOne({_id:userId},{$set:{status:'blocked'}});
  check('blocked customer cannot use existing access',(await customer.request('GET','/api/auth/customer/me')).status===401);
  check('blocked customer cannot refresh',(await customer.request('POST','/api/auth/customer/refresh')).status===403);
  check('blocked customer cannot login',(await anon.request('POST','/api/auth/customer/login',{identifier:registration.email,password})).status===403);
  await UserModel.updateOne({_id:userId},{$set:{status:'active',deletedAt:new Date()}});
  check('deleted customer cannot access profile',(await customer.request('GET','/api/auth/customer/me')).status===401);
  check('deleted customer cannot refresh',(await customer.request('POST','/api/auth/customer/refresh')).status===401);
  const adminCookie=new Session();adminCookie.cookies.set('customerAccessToken',createAccessToken(admin.id,'admin'));
  check('admin token cannot impersonate customer',(await adminCookie.request('GET','/api/auth/customer/me')).status===401);

  const brand=await BrandModel.create({name:'Brand',slug:'week08-brand',status:'active'});
  const category=await CategoryModel.create({name:'Category',slug:'week08-category',status:'active'});
  const product=await ProductModel.create({name:'Racket',slug:'week08-racket',brand:brand._id,category:category._id,status:'active',basePrice:100000,salePrice:90000,description:'<p>Clean description</p>',images:[],specifications:[],variants:[{sku:'W08-A',colorName:'Đen',stock:3,price:120000,salePrice:0},{sku:'W08-B',colorName:'Trắng',stock:5,price:80000}]});
  const line={productId:product.id,sku:'W08-A',quantity:2};
  const cart=items=>anon.request('POST','/api/checkout/check',{items});
  r=await cart([line]);
  check('guest cart check uses live SKU zero price',r.status===200&&r.data.data.canCheckout&&r.data.data.items[0].unitPrice===0&&r.data.data.subtotal===0);
  check('cart check is not cached and does not reserve stock',r.cacheControl==='no-store'&&r.data.data.reservation===false&&(await ProductModel.findById(product.id)).variants[0].stock===3);
  r=await cart([{...line,expectedUnitPrice:123}]);
  check('stale client price reports live price and requires confirmation',r.status===200&&!r.data.data.canCheckout&&r.data.data.items[0].issues.includes('PRICE_CHANGED')&&r.data.data.items[0].unitPrice===0);
  r=await cart([line,line]);
  check('duplicate SKU quantities are combined before checking stock',r.data.data.items.length===1&&r.data.data.items[0].quantity===4&&r.data.data.items[0].issues.includes('OUT_OF_STOCK'));
  r=await cart([{...line,sku:'W08-B',quantity:1}]);
  check('inherited sale never exceeds SKU regular price',r.data.data.items[0].unitPrice===80000);
  r=await cart([line,{...line,sku:'W08-B',quantity:2}]);
  check('server calculates full cart subtotal from live SKU prices',r.data.data.canCheckout&&r.data.data.subtotal===160000);
  r=await cart([{...line,sku:'MISSING'}]);
  check('SKU must belong to requested product',!r.data.data.canCheckout&&r.data.data.items[0].issues.includes('SKU_UNAVAILABLE')&&r.data.data.subtotal===null);
  r=await cart([{...line,productId:new mongoose.Types.ObjectId().toString()}]);
  check('missing product is unavailable',r.data.data.items[0].issues.includes('PRODUCT_UNAVAILABLE'));
  for(const item of [{...line,quantity:0},{...line,quantity:1.5},{...line,productId:'bad'},{...line,unitPrice:1},{...line,expectedUnitPrice:-1}])check('reject invalid cart '+JSON.stringify(item),(await cart([item])).status===400);
  check('reject empty cart',(await cart([])).status===400);
  check('reject more than 50 lines',(await cart(Array(51).fill(line))).status===400);
  check('reject client subtotal',(await anon.request('POST','/api/checkout/check',{items:[line],subtotal:1})).status===400);
  const catalog=await listCatalogProducts(),snapshot=planRagSync(catalog);
  check('RAG text strips HTML and omits live data',!snapshot.documents[0].content.includes('<p>')&&!snapshot.documents[0].content.includes('Tồn kho'));
  r=await anon.request('GET','/api/rag/preview');
  check('preview returns validated document schema',r.status===200&&ragDocumentSchema.safeParse(r.data.products[0].document).success);
  for(const [label,model,id,patch]of [
    ['inactive product',ProductModel,product.id,{status:'inactive'}],
    ['draft product',ProductModel,product.id,{status:'draft'}],
    ['deleted product',ProductModel,product.id,{deletedAt:new Date()}],
    ['inactive category',CategoryModel,category.id,{status:'inactive'}],
    ['deleted category',CategoryModel,category.id,{deletedAt:new Date()}],
    ['inactive brand',BrandModel,brand.id,{status:'inactive'}],
    ['deleted brand',BrandModel,brand.id,{deletedAt:new Date()}],
  ]){
    await model.updateOne({_id:id},{$set:patch});
    r=await cart([line]);
    check('cart excludes '+label,!r.data.data.canCheckout&&r.data.data.items[0].unitPrice===null);
    const plan=planRagSync(await listCatalogProducts(),snapshot.documents);
    check('RAG deactivates '+label,plan.actions[0].action==='deactivate');
    await model.updateOne({_id:id},{$set:{status:'active',deletedAt:null}});
    check('RAG reactivates after '+label,planRagSync(await listCatalogProducts(),plan.documents).actions[0].reason==='reactivated');
  }
} catch(error) {
  console.log('TEST_ERROR',error.code??error.name,error.message?.replace(/mongodb[^\s]*/gi,'[redacted]'));
  check('execution completed',false);process.exitCode=1;
} finally {
  if(server)await new Promise(resolve=>server.close(resolve));
  if(mongoose.connection.readyState===1){
    if(!/^codex_audit_w08_\d+$/.test(dbName)||mongoose.connection.name!==dbName)throw Error('CLEANUP_ISOLATION_CHECK_FAILED');
    try { await mongoose.connection.db.dropDatabase(); }
    catch(error) {
      if(![13,8000].includes(error.code))throw error;
      // Atlas classroom accounts may allow writes but deny dropping a database.
      // Delete only documents in this verified, uniquely named test database.
      for(const collection of await mongoose.connection.db.collections())await collection.deleteMany({});
      check('isolated test database documents cleaned',await Promise.all((await mongoose.connection.db.collections()).map(c=>c.countDocuments())).then(counts=>counts.every(count=>count===0)));
    }
  }
  await mongoose.disconnect();
  await fs.mkdir(new URL('../../docs/evidence/',import.meta.url),{recursive:true});
  await fs.writeFile(new URL('../../docs/evidence/week08-api-results.json',import.meta.url),JSON.stringify({suite:'week-08',executedAt:new Date().toISOString(),isolatedDatabase:true,results},null,2)+'\n');
  console.log('RESULT',results.length,'PASS',results.filter(x=>x.pass).length,'FAIL',results.filter(x=>!x.pass).length);
  if(results.some(x=>!x.pass))process.exitCode=1;
}
