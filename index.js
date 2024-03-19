const express=require('express')

const path=require('path')
const app=express();
const methodOverride=require('method-override')

app.use(express.static(path.join(__dirname, 'public')))

app.set('view engine','ejs')
app.set('views',path.join(__dirname,'/views'))

app.use(express.urlencoded({extended:true}))
app.use(methodOverride('_method'))

const mysql=require('mysql2')
const dotenv=require('dotenv')
dotenv.config()

const pool=mysql.createPool({
    host:process.env.MYSQL_HOST,
    user:process.env.MYSQL_USER,
    password:process.env.MYSQL_PASSWORD,
    database:process.env.MYSQL_DATABASE
}).promise()

var uname;
var upass;
async function getFiles(){
    const [rows]=await pool.query(`SELECT * FROM notes WHERE access=?`,[uname])
    return rows
}
async function getFile(id){
    const [rows]=await pool.query(`
    SELECT * 
    FROM notes 
    where id=? AND access=?
    `,[id,uname])
    return rows[0]
}
async function createFile(title,content){
    const [result]=await pool.query(`
    INSERT 
    INTO notes (title,contents,access)
    VALUES(?,?,?)
    `,[title,content,uname])
}

var obj;
app.get('/login',(req,res)=>{
    obj=[{error:""}]
    res.render('comments/login',{obj})
})
app.post('/correct',async(req,res)=>{
    uname=req.body.user;
    upass=req.body.pass;
    const [result]=await pool.query(`
    SELECT *FROM users
    WHERE mail=? AND pass=? 
    `,[uname,upass])
    if(result.length>0)
    {
        const files=await getFiles()
        res.render('comments/index',{comments:files})
    }
    else
    {
        obj[0].error="Wrong credentials,please try to login again!!!!"
        res.render('comments/login',{obj})
    }
})

app.get('/comments/search-files',async (req,res)=>{
    const [result]=await pool.query(`
    SELECT *FROM notes WHERE access=?
    `,[uname])
    res.render('comments/search-files',{comments:result})

})
app.get('/comments/search',async(req,res)=>{
    const name1=req.query.ele;
        const [result]=await pool.query(`
        SELECT * FROM notes
         WHERE  title LIKE ? AND access=?
        `,[`%${name1}%`,uname])
        if(result.length)
        {
            res.render('comments/search-files',{comments:result})
        }
        else
        {
            const obj={
                id:name1
            }
            res.render('comments/notfound',{obj})
        }
})

app.get('/comments',async (req,res)=>{
    const files=await getFiles()
    res.render('comments/index',{comments:files})
})

app.get('/comments/new',(req,res)=>{
    res.render('comments/new')
})
app.post('/comments',async(req,res)=>{
    const {title,contents}=req.body;
    await createFile(title,contents)
    res.redirect('/comments')
})

app.get('/comments/:id',async(req,res)=>{
    const id=req.params.id;
    const file=await getFile(id)
    res.render('comments/show',{comment:file})
})

app.get('/comments/:id/edit',async (req,res)=>{
    const id=req.params.id;
    const file=await getFile(id)
    res.render('comments/edit',{file})
})
app.patch('/comments/:id',async(req,res)=>{
        const {id}=req.params;
        const newText=req.body.comment
        await pool.query(`
        UPDATE notes
        SET contents=?
        WHERE id=? AND access=?`,[newText,id,uname])
        res.redirect('/comments')
})

app.delete('/comments/:id',async (req,res)=>{
        const {id}=req.params;
        await pool.query(`
        DELETE FROM
        notes
        WHERE id=? AND access=?`,[id,uname])
        res.redirect('/comments')
})


app.use((err,req,res,next)=>{
    console.error(err.stack)
    res.status(500).send('something broke')
})
app.listen(8080,()=>{
    console.log('listening on port 8080')
})