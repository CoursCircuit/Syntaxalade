const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const asar=require('@electron/asar');

test('packaging dependencies preserve HTML and main files in ASAR archives',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'syntaxalade-package-test-'));
 try{
  const source=path.join(tmp,'source'),archive=path.join(tmp,'app.asar');
  await fs.mkdir(path.join(source,'electron'),{recursive:true});
  await fs.writeFile(path.join(source,'index.html'),'<html lang="fr">Un fichier réel.</html>');
  await fs.writeFile(path.join(source,'electron/main.js'),'// Test-only packaging entry.');
  await asar.createPackage(source,archive);
  const entries=asar.listPackage(archive);
  assert.ok(entries.includes('/index.html'));
  assert.ok(entries.includes('/electron/main.js'));
  assert.equal(asar.extractFile(archive,'index.html').toString(),'<html lang="fr">Un fichier réel.</html>');
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
});
