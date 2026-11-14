import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config({path:fileURLToPath(new URL('../.env',import.meta.url)),quiet:true});
await fs.mkdir(new URL('../../.tmp_baocao/',import.meta.url),{recursive:true});
process.env.NODE_ENV='test';
process.env.JWT_ACCESS_SECRET=randomUUID()+randomUUID();
process.env.JWT_REFRESH_SECRET=randomUUID()+randomUUID();
const dbName='codex_audit_w01_w04_'+Date.now();
const results=[];
let server;
let connected=false;
const check=(name,pass,detail='')=>{results.push({name,pass:Boolean(pass),detail});console.log(`${pass?'PASS':'FAIL'} ${name}${detail?' | '+detail:''}`);};
class Session {
  cookies=new Map();
  async request(method,path,body,options={}) {
    const headers={...(options.headers??{})};
    if(this.cookies.size)headers.Cookie=[...this.cookies].map(([k,v])=>`${k}=${v}`).join('; ');
    let payload=body;
    if(body!==undefined && !(body instanceof FormData)){headers['Content-Type']='application/json';payload=JSON.stringify(body);}
    const r=await fetch(base+path,{method,headers,body:payload});
    const cookieHeaders=r.headers.getSetCookie();
    for(const c of cookieHeaders){const [kv]=c.split(';');const at=kv.indexOf('=');const k=kv.slice(0,at),v=kv.slice(at+1);if(v)this.cookies.set(k,v);else this.cookies.delete(k);}
    let data;
    if(r.headers.get('content-type')?.includes('application/json'))data=await r.json();
    else data=Buffer.from(await r.arrayBuffer());
    return {status:r.status,data,headers:r.headers,cookieHeaders};
  }
}
let base;
try {
  await mongoose.connect(process.env.MONGODB_URI,{dbName,serverSelectionTimeoutMS:10000});
  connected=true;
  if(mongoose.connection.name!==dbName)throw new Error('ISOLATION_CHECK_FAILED');
  const {app}=await import('../dist/app.js');
  const {UserModel}=await import('../dist/modules/users/user.model.js');
  const {CategoryModel}=await import('../dist/modules/categories/category.model.js');
  const {BrandModel}=await import('../dist/modules/brands/brand.model.js');
  const {ProductModel}=await import('../dist/modules/products/product.model.js');
  const {listCatalogProducts}=await import('../dist/modules/catalog/catalog.service.js');
  const {createRefreshToken}=await import('../dist/modules/auth/auth.tokens.js');
  await Promise.all([UserModel.init(),CategoryModel.init(),BrandModel.init(),ProductModel.init()]);
  const password=randomUUID();
  const hash=await bcrypt.hash(password,4);
  const [admin,customer]=await UserModel.create([{name:'Audit Admin',email:'admin@audit.invalid',password:hash,role:'admin'},{name:'Audit Customer',email:'customer@audit.invalid',password:hash,role:'customer'}]);
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  base=`http://127.0.0.1:${server.address().port}`;
  const anon=new Session(),a=new Session(),c=new Session();
  let r=await anon.request('GET','/api/health');check('W03 health',r.status===200);
  for(const path of ['/api/admin/categories','/api/admin/brands','/api/admin/products']){r=await anon.request('GET',path);check('W03 anonymous denied '+path,r.status===401);}
  r=await a.request('POST','/api/auth/login',{email:admin.email,password});check('W03 admin login',r.status===200);
  check('W03 cookies HttpOnly SameSite',r.cookieHeaders.length===2&&r.cookieHeaders.every(x=>/HttpOnly/i.test(x)&&/SameSite=Lax/i.test(x)));
  r=await a.request('GET','/api/auth/me');check('W03 admin me',r.status===200&&r.data.data.user.role==='admin');
  check('W03 refresh unique in same second',Array.from({length:100},()=>createRefreshToken(admin.id,'admin')!==createRefreshToken(admin.id,'admin')).every(Boolean));
  r=await c.request('POST','/api/auth/customer/login',{identifier:customer.email,password});check('W03 customer login',r.status===200);
  r=await c.request('GET','/api/admin/categories');check('W03 customer cookies denied admin',r.status===401||r.status===403);
  const forgedRole=new Session();forgedRole.cookies.set('accessToken',jwt.sign({role:'customer'},process.env.JWT_ACCESS_SECRET,{subject:customer.id,expiresIn:'15m'}));
  r=await forgedRole.request('GET','/api/admin/categories');check('W03 authenticated customer denied 403',r.status===403);
  const expired=new Session();expired.cookies.set('accessToken',jwt.sign({role:'admin'},process.env.JWT_ACCESS_SECRET,{subject:admin.id,expiresIn:-1}));
  r=await expired.request('GET','/api/admin/categories');check('W03 expired token denied',r.status===401);
  const before=a.cookies.get('refreshToken');r=await a.request('POST','/api/auth/refresh');check('W03 refresh valid',r.status===200);
  check('W03 immediate refresh rotates token',before!==a.cookies.get('refreshToken'),'Consecutive refresh in same second');
  await new Promise(resolve=>setTimeout(resolve,1100));
  const previous=a.cookies.get('refreshToken');r=await a.request('POST','/api/auth/refresh');check('W03 delayed refresh rotates token',r.status===200&&previous!==a.cookies.get('refreshToken'));
  const old=new Session();old.cookies.set('refreshToken',previous);r=await old.request('POST','/api/auth/refresh');check('W03 reused previous refresh rejected',r.status===401);
  for(const [kind,key] of [['categories','category'],['brands','brand']]) {
    const path='/api/admin/'+kind;
    r=await a.request('POST',path,{name:'Audit '+kind,slug:'audit-'+kind});check('W04 create '+kind,r.status===201);const id=r.data.data[key]._id;
    r=await a.request('GET',path+'/'+id);check('W04 read '+kind,r.status===200&&r.data.data[key].slug==='audit-'+kind);
    r=await a.request('POST',path,{name:'Duplicate',slug:'audit-'+kind});check('W04 duplicate slug '+kind,r.status===409);
    r=await a.request('PATCH',path+'/'+id,{description:'Updated audit record',status:'inactive'});check('W04 update '+kind,r.status===200&&r.data.data[key].description==='Updated audit record');
    r=await a.request('GET',path+'?status=inactive&search=Audit');check('W04 search status '+kind,r.status===200&&r.data.data[kind].some(x=>x._id===id));
    r=await a.request('PATCH',path+'/'+id,{});check('W04 empty patch '+kind,r.status===400);
    r=await a.request('GET',path+'/invalid-id');check('W04 invalid id '+kind,r.status===400);
    r=await a.request('GET',path+'/'+new mongoose.Types.ObjectId());check('W04 missing id '+kind,r.status===404);
    r=await a.request('DELETE',path+'/'+id);check('W04 soft delete unused '+kind,r.status===200);
    const model=kind==='categories'?CategoryModel:BrandModel;const row=await model.findById(id).lean();check('W04 soft-delete persisted '+kind,row.deletedAt&&row.status==='inactive');
    r=await a.request('GET',path+'/'+id);check('W04 deleted hidden '+kind,r.status===404);
  }
  const cat=await CategoryModel.create({name:'Audit Active Category',slug:'audit-active-category',status:'active'});
  const brand=await BrandModel.create({name:'Audit Active Brand',slug:'audit-active-brand',status:'active'});
  const makeProduct=(name,status='active')=>({name,slug:name,category:cat._id,brand:brand._id,status,basePrice:100000,images:[{url:'https://example.invalid/a.png',isPrimary:true}],variants:[{sku:name.toUpperCase(),colorName:'Black',stock:3,attributes:[]}]});
  const product=await ProductModel.create(makeProduct('audit-visible-product'));
  await CategoryModel.updateOne({_id:cat._id},{$set:{description:'Preserve category',imageUrl:'/uploads/catalog/example',sortOrder:9,attributes:[{key:'weight',label:'Weight',dataType:'number',scope:'specification'}]}});
  await a.request('PATCH','/api/admin/categories/'+cat.id,{status:'active'});
  const patchedCategory=await CategoryModel.findById(cat._id).lean();
  check('W04 partial category patch preserves fields',patchedCategory.description==='Preserve category'&&patchedCategory.imageUrl==='/uploads/catalog/example'&&patchedCategory.sortOrder===9&&patchedCategory.attributes.length===1);
  await BrandModel.updateOne({_id:brand._id},{$set:{description:'Preserve brand',logoUrl:'/uploads/catalog/example',sortOrder:9}});
  await a.request('PATCH','/api/admin/brands/'+brand.id,{status:'active'});
  const patchedBrand=await BrandModel.findById(brand._id).lean();
  check('W04 partial brand patch preserves fields',patchedBrand.description==='Preserve brand'&&patchedBrand.logoUrl==='/uploads/catalog/example'&&patchedBrand.sortOrder===9);
  for(const [kind,id]of [['categories',cat.id],['brands',brand.id]]){r=await a.request('DELETE','/api/admin/'+kind+'/'+id);check('W04 prevent deletion referenced '+kind,r.status===409);}
  r=await anon.request('GET','/api/products?category='+cat.slug+'&brand='+brand.slug);check('W04 public category brand filters',r.status===200&&r.data.data.products.length===1&&r.data.data.products[0].id===product.id);
  await ProductModel.create(makeProduct('audit-draft-product','draft'));
  await ProductModel.create({...makeProduct('audit-soft-deleted-product'),deletedAt:new Date()});
  r=await anon.request('GET','/api/products');check('W04 public excludes draft deleted',r.status===200&&r.data.data.products.length===1);
  r=await anon.request('GET','/api/products/audit-draft-product');check('W04 public detail excludes draft',r.status===404);
  const catalog=await listCatalogProducts();
  check('W04 RAG excludes draft deleted',catalog.length===1,'actual='+catalog.map(x=>x.slug).join(','));
  check('W04 RAG has category brand metadata',catalog.every(x=>x.categoryId&&x.categorySlug&&x.brandId&&x.brandSlug));
  await CategoryModel.updateOne({_id:cat._id},{$set:{status:'inactive'}});
  r=await anon.request('GET','/api/products');check('W04 public excludes inactive category',r.status===200&&r.data.data.products.length===0,'returned='+r.data.data.products.length);
  r=await anon.request('GET','/api/products/'+product.slug);check('W04 detail excludes inactive category',r.status===404,'status='+r.status);
  r=await anon.request('GET','/api/products?category='+cat.slug);check('W04 explicit inactive category filter empty',r.status===200&&r.data.data.products.length===0);
  await CategoryModel.updateOne({_id:cat._id},{$set:{status:'active'}});
  await BrandModel.updateOne({_id:brand._id},{$set:{status:'inactive'}});
  r=await anon.request('GET','/api/products');check('W04 public excludes inactive brand',r.status===200&&r.data.data.products.length===0,'returned='+r.data.data.products.length);
  r=await anon.request('GET','/api/products/'+product.slug);check('W04 detail excludes inactive brand',r.status===404,'status='+r.status);
  check('W04 RAG excludes inactive brand',(await listCatalogProducts()).length===0);
  await BrandModel.updateOne({_id:brand._id},{$set:{status:'active'}});
  await CategoryModel.updateOne({_id:cat._id},{$set:{deletedAt:new Date()}});
  r=await anon.request('GET','/api/products');check('W04 public excludes deleted category',r.data.data.products.length===0);
  r=await anon.request('GET','/api/products/'+product.slug);check('W04 detail excludes deleted category',r.status===404);
  check('W04 RAG excludes deleted category',(await listCatalogProducts()).length===0);
  await CategoryModel.updateOne({_id:cat._id},{$set:{deletedAt:null}});
  await BrandModel.updateOne({_id:brand._id},{$set:{deletedAt:new Date()}});
  r=await anon.request('GET','/api/products');check('W04 public excludes deleted brand',r.data.data.products.length===0);
  r=await anon.request('GET','/api/products/'+product.slug);check('W04 detail excludes deleted brand',r.status===404);
  check('W04 RAG excludes deleted brand',(await listCatalogProducts()).length===0);
  await BrandModel.updateOne({_id:brand._id},{$set:{deletedAt:null}});
  r=await anon.request('GET','/api/rag/preview');
  check('W04 preview maps metadata to source',r.status===200&&r.data.products.length===1&&r.data.products[0].categoryId===cat.id&&r.data.products[0].categorySlug===cat.slug&&r.data.products[0].brandId===brand.id&&r.data.products[0].brandSlug===brand.slug);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64');
  const form=(bytes,type='image/png',name='audit.png')=>{const f=new FormData();f.append('image',new Blob([bytes],{type}),name);return f;};
  r=await anon.request('POST','/api/admin/uploads/catalog-image',form(png));check('W04 upload requires admin',r.status===401);
  r=await a.request('POST','/api/admin/uploads/catalog-image',form(png));check('W04 valid PNG upload',r.status===201);
  const imagePath=r.data.data?.image?.url;
  if(imagePath){r=await anon.request('GET',imagePath);check('W04 image byte roundtrip',r.status===200&&Buffer.isBuffer(r.data)&&r.data.equals(png));r=await anon.request('GET',imagePath);check('W04 image reread',r.status===200&&r.data.equals(png));}
  r=await a.request('POST','/api/admin/uploads/catalog-image',form(Buffer.from('not an image'),'text/plain','audit.txt'));check('W04 wrong MIME rejected',r.status===400);
  r=await a.request('POST','/api/admin/uploads/catalog-image',form(Buffer.alloc(5*1024*1024+1)));check('W04 oversized rejected',r.status===400);
  r=await a.request('POST','/api/admin/uploads/catalog-image',new FormData());check('W04 missing file rejected',r.status===400);
  r=await anon.request('GET','/uploads/catalog/invalid-id');check('W04 image invalid id',r.status===400);
  r=await anon.request('GET','/uploads/catalog/'+new mongoose.Types.ObjectId());check('W04 image missing id',r.status===404);
  r=await a.request('POST','/api/admin/uploads/catalog-image',form(Buffer.from('not a PNG'),'image/png'));check('W04 binary signature validated',r.status===400,'status='+r.status);
  for(const [filename,mime]of [['audit_valid.jpg','image/jpeg'],['audit_valid.webp','image/webp']]){
    const bytes=await fs.readFile(new URL('./fixtures/'+filename,import.meta.url));
    r=await a.request('POST','/api/admin/uploads/catalog-image',form(bytes,mime,filename));check('W04 valid '+mime+' upload',r.status===201);
    if(r.data.data?.image?.url){const image=await anon.request('GET',r.data.data.image.url);check('W04 '+mime+' byte roundtrip',image.status===200&&image.data.equals(bytes));}
  }
  const testCategory = await CategoryModel.create({name:'Week Five',slug:'week-five',attributes:[{key:'material',label:'Material',dataType:'text',scope:'specification'}]});
  const draft = {
    name:'Week Five Product', categoryId:testCategory.id, brandId:brand.id, status:'active',
    basePrice:100000, salePrice:90000, shortDescription:'Keep this summary',
    description:'<h2>Keep this description</h2><iframe title="Unsupported content"></iframe>',
    images:[{url:'https://example.invalid/front.png',isPrimary:true},{url:'https://example.invalid/back.png'}],
    specifications:[{key:'material',label:'Material',value:'Nylon'}],
    variants:[{sku:'week-five-red',colorName:'Red',price:65000,salePrice:50000,stock:4},{sku:'week-five-blue',colorName:'Blue',price:120000,salePrice:0,stock:0}],
  };
  const productRoute = '/api/admin/products';
  r = await a.request('POST',productRoute,draft);
  check('W05 product created with rich text and gallery',r.status===201&&r.data.data.product.description==='<h2>Keep this description</h2>'&&r.data.data.product.images.length===2);
  const created = r.data.data.product;
  const editRoute = `${productRoute}/${created._id}`;
  r = await a.request('PATCH',editRoute,{basePrice:110000});
  const edited = r.data.data?.product;
  check('W05 changing only price preserves existing product data',r.status===200&&edited.basePrice===110000&&edited.status==='active'&&edited.shortDescription===draft.shortDescription&&edited.description===created.description&&edited.specifications[0].value==='Nylon'&&edited.images.length===2&&edited.variants.length===2);
  for (const [name,payload] of [
    ['empty patch',{}],['invalid combined price',{basePrice:85000}],
    ['negative inventory',{variants:[{...draft.variants[0],stock:-1}]}],
    ['duplicate SKU in product',{variants:[draft.variants[0],{...draft.variants[1],sku:'WEEK-FIVE-RED'}]}],
    ['invalid SKU discount',{variants:[{...draft.variants[0],salePrice:70000}]}],
    ['missing primary image',{images:[{url:'https://example.invalid/photo.png'}]}],
  ]) {
    r = await a.request('PATCH',editRoute,payload);
    check(`W05 rejects ${name}`,r.status===400);
  }
  r = await a.request('POST',productRoute,{...draft,name:'Week Five Duplicate'});
  check('W05 rejects SKU used by another product',r.status===409);
  const afterRejected = await a.request('GET',editRoute);
  check('W05 rejected changes preserve the saved product',afterRejected.status===200&&afterRejected.data.data.product.basePrice===110000&&afterRejected.data.data.product.variants.length===2);
  const exported = (await listCatalogProducts()).find(item=>item.id===created._id);
  check('W05 catalog preview uses SKU prices and stock, including zero',exported?.effectivePrice===0&&exported.variants[0].effectivePrice===50000&&exported.variants[1].stock===0&&exported.totalStock===4);
  r = await a.request('DELETE',editRoute);
  const removed = await anon.request('GET',`/api/products/${created.slug}`);
  check('W05 deleted product is hidden from storefront',r.status===200&&removed.status===404);
  const refreshBeforeLogout=a.cookies.get('refreshToken');r=await a.request('POST','/api/auth/logout');check('W03 logout clears cookies',r.status===200&&!a.cookies.has('accessToken')&&!a.cookies.has('refreshToken'));
  r=await a.request('GET','/api/auth/me');check('W03 logged-out session denied',r.status===401);
  const afterLogout=new Session();afterLogout.cookies.set('refreshToken',refreshBeforeLogout);r=await afterLogout.request('POST','/api/auth/refresh');check('W03 refresh revoked on logout',r.status===401);
} catch(error) {
  console.log('AUDIT_BLOCKED',error?.code??error?.name??'UnknownError');
  results.push({name:'Audit execution',pass:false,detail:error?.code??error?.name??'UnknownError'});
  process.exitCode=1;
} finally {
  if(server)await new Promise(resolve=>server.close(resolve));
  if(connected){
    if(!/^codex_audit_w01_w04_\d+$/.test(dbName)||mongoose.connection.name!==dbName)throw new Error('CLEANUP_ISOLATION_CHECK_FAILED');
    try {
      await mongoose.connection.db.dropDatabase();
      console.log('CLEANUP isolated temporary database removed');
    } catch {
      for(const collection of await mongoose.connection.db.collections())await collection.deleteMany({});
      console.log('CLEANUP all temporary records removed; empty database retained due to Atlas permissions');
    }
  }
  await mongoose.disconnect();
  await fs.writeFile(new URL('../../.tmp_baocao/audit_weeks_01_04_results.json',import.meta.url),JSON.stringify({date:'2026-11-15',isolatedDatabase:true,results},null,2));
  console.log('TOTAL',results.length,'PASS',results.filter(x=>x.pass).length,'FAIL',results.filter(x=>!x.pass).length);
  if(results.some(x=>!x.pass))process.exitCode=1;
}
