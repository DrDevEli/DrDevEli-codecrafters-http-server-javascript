const net = require("net");
const fs = require('fs');
const zlib = require('zlib');

// Helper function to decompress data based on Content-Encoding
function decompressData(data, encoding, callback) {
    if (encoding === 'gzip') {
        zlib.gunzip(data, callback);
    } else if (encoding === 'deflate') {
        zlib.inflate(data, callback);
    } else {
        callback(null, data); // No Compression
    }
}

// Helper function to compress data based on Accept-Encoding
function compressData(data, encoding, callback) {
    if (encoding.includes('gzip')) {
        zlib.gzip(data, callback);
    } else if (encoding.includes('deflate')) {
        zlib.deflate(data, callback);
    } else {
        callback(null, data); // No Compression
    }
}

// Function to determine the best encoding method
function getBestEncoding(acceptEncoding) {
    const encodings = acceptEncoding.split(',').map(e => e.trim());
    if (encodings.includes('gzip')) {
        return 'gzip';
    } else if (encodings.includes('deflate')) {
        return 'deflate';
    }
    return '';
}

// Create the server
const server = net.createServer((socket) => {
    socket.on("data", (data) => {
        const request = data.toString();
        console.log("Request: \n" + request);

        const [requestLine, ...headerLines] = request.split("\r\n");
        const [method, url] = requestLine.split(' ');

        let headers = {};
        let body = "";
        let parsingHeaders = true;
        let contentEncoding = '';
        let acceptEncoding = '';

        // Parse headers
        for (let line of headerLines) {
            if (parsingHeaders) {
                if (line === '') {
                    parsingHeaders = false;
                } else {
                    const [key, value] = line.split(': ');
                    headers[key] = value;
                    if (key === 'Content-Encoding') contentEncoding = value;
                    if (key === 'Accept-Encoding') acceptEncoding = value;
                }
            } else {
                body += line;
            }
        }

        decompressData(Buffer.from(body), contentEncoding, (err, decompressedBody) => {
            if (err) {
                console.error('Error decompressing body:', err);
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                socket.end();
                return;
            }

            if (method === 'POST' && url.startsWith("/files/")) {
                const directory = process.argv[3];
                const filename = url.split("/files/")[1];
                const filePath = `${directory}/${filename}`;

                fs.writeFile(filePath, decompressedBody, (err) => {
                    if (err) {
                        console.error('Error writing file:', err);
                        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
                    } else {
                        console.log(`File ${filename} created successfully.`);
                        socket.write('HTTP/1.1 201 Created\r\n\r\n');
                    }
                    socket.end();
                });

            } else if (method === 'GET' && url.startsWith("/files/")) {
                const directory = process.argv[3];
                const filename = url.split("/files/")[1];
                const filePath = `${directory}/${filename}`;

                if (fs.existsSync(filePath)) {
                    fs.readFile(filePath, (err, content) => {
                        if (err) {
                            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
                            socket.end();
                        } else {
                            const bestEncoding = getBestEncoding(acceptEncoding);
                            compressData(content, bestEncoding, (err, compressedContent) => {
                                if (err) {
                                    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
                                    socket.end();
                                } else {
                                    const headers = `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${compressedContent.length}\r\n${bestEncoding ? `Content-Encoding: ${bestEncoding}\r\n` : ''}\r\n`;
                                    socket.write(headers);
                                    socket.write(compressedContent);
                                    socket.end();
                                }
                            });
                        }
                    });
                } else {
                    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
                    socket.end();
                }
            } else if (url === '/') {
                socket.write('HTTP/1.1 200 OK\r\n\r\n');
                socket.end();
            } else if (url === "/user-agent") {
                const userAgentHeader = headerLines.find(line => line.startsWith('User-Agent: '));
                if (userAgentHeader) {
                    const userAgent = userAgentHeader.split('User-Agent: ')[1];
                    socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${userAgent.length}\r\n\r\n${userAgent}`);
                } else {
                    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                }
                socket.end();
            } else if (url.startsWith("/echo/")) {
                const content = url.split('/echo/')[1];
                const bestEncoding = getBestEncoding(acceptEncoding);
                compressData(Buffer.from(content), bestEncoding, (err, compressedContent) => {
                    if (err) {
                        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
                        socket.end();
                    } else {
                        const headers = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${compressedContent.length}\r\n${bestEncoding ? `Content-Encoding: ${bestEncoding}\r\n` : ''}\r\n`;
                        socket.write(headers);
                        socket.write(compressedContent);
                        socket.end();
                    }
                });
            } else {
                socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
                socket.end();
            }
        });
    });
});

server.listen(4221, "localhost", () => {
    console.log("Server is running on port 4221");
});
