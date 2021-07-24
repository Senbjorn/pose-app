import React, { useEffect, useState } from 'react';
import Box from '@material-ui/core/Box';
import env from 'react-dotenv';
import socketIOClient from "socket.io-client";

export function StreamPage(props) {
    const [response, setResponse] = useState("");
    useEffect(() => {
        const socket = socketIOClient(`${env.STREAM_HOST}:${env.STREAM_PORT}`);
        socket.on("image", data => {
          setResponse(data);
        });
    }, []);
    const imgData = `data:image/jpeg;base64,${response}`;
    return (
        <Box>
            <img src={imgData} alt={'stream'}/>
        </Box>
    );
}