const MAX_LEN = 5;

const generateId = () =>{
    let id = ""
    const characters = "123456789qwertyuiopasdfghjklzxcvbnm"
    for(let i=0;i<=MAX_LEN;i++)
    {
        id += characters[Math.floor(Math.random() * characters.length)]
    }
    return id;
}

export default generateId