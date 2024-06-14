const net = require("net");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
   
    socket.on("data", (data)=>{
        const request = data.toString();
        console.log("Request: \n" + request);

        const url = request.split(" ")[1];
        const headers = request.split('\r\n');
        
        if(url == "/"){
            socket.write("HTTP/1.1 200 OK\r\n\r\n");
        }else if(url.includes("/echo/")){
            const content = url.split('/echo/')[1];
            socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${content.length}\r\n\r\n${content}`)
        }else if(url == "/user-agent"){
            const userAgent = headers[2].split('User-Agent: ')[1];
            socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${userAgent.length}\r\n\r\n${userAgent}`)

        }else{
            socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        }
     })
 });





 server.listen(4221, "localhost");
