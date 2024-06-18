const net = require("net");
const fs = require('fs');

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
   
    socket.on("data", (data)=>{
        const request = data.toString();
        console.log("Request: \n" + request);

        const [requestLine, ...headerLines] = request.split("\r\n");
        const [method, url] = requestLine.split(' ');

        //Initialize var for headres and body
        let headers = {};
        let body = "";

        //Parse headres and body 
        let parsingHeaders = true;
        headerLines.forEach(line => {
          if (parsingHeaders) {
            if (line === '') {
              parsingHeaders = false;
            } else {
              const [key, value] = line.split(': ');
              headers[key] = value;
            }
          } else {
            body += line ;
          }
        });

        if(method === 'POST' && url.startsWith("/files/")){
            const directory = process.argv[3];
            const filename = url.split("/files/")[1];
            const filePath = `${directory}/${filename}`;
            fs.writeFile(filePath, body, (err)=>{
                if(err){
                    console.error('Error writing file:', err)
                    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n')
                }else{
                    console.log(`File ${filename} created successfully.`);
                    socket.write('HTTP/1.1 201 Created\r\n\r\n');
                  }
                    socket.end();
                });
            }else if(method === 'GET' && url.startsWith("/files/")){
                const directory = process.argv[3];
                const filename = url.split("/files/")[1];
                const filePath = `${directory}/${filename}`;
                if(fs.existsSync(filePath)){
                    fs.readFile(filePath, (err, content) =>{
                        if(err){
                            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
                        }else{
                            socket.write(`HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${content.length}\r\n\r\n${content}`);
                        
                        }
                        socket.end();
                    });
                }else{
                socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
                socket.end();
            }
        }else if (url === '/') {
            socket.write('HTTP/1.1 200 OK\r\n\r\n');
            socket.end();
        }else if(url === "/user-agent"){
            const userAgentHeader = headerLines.find(line => line.startsWith('User-Agent: '))
            if(userAgentHeader){
                const userAgent = userAgentHeader.split('User-Agent: ')[1];
            socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${userAgent.length}\r\n\r\n${userAgent}`)
        }else{
            socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        }
        socket.end();
        }else if(url.includes("/echo/")){
            const content = url.split('/echo/')[1];
            socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${content.length}\r\n\r\n${content}`)
            socket.end();
        }else{
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.end();
        }
     })
 });





 server.listen(4221, "localhost");
