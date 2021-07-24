import React, { useEffect, useState } from 'react';
import Box from '@material-ui/core/Box';
import axios from 'axios';
import env from 'react-dotenv';


export function HistoryPage(props) {
    const [data, setData] = useState([]);
    const [count, setCount] = useState("");
    useEffect(() => {
        setInterval(() => {
            axios.get(`http://${env.STREAM_HOST}:${env.STREAM_PORT}/handsup`)
            .then(res => {
                setData(res.data);
            })
            .catch(err => {
                console.log(err);
            })
            axios.get(`http://${env.STREAM_HOST}:${env.STREAM_PORT}/count`)
            .then(res => {
                setCount(res.data.count);
            })
            .catch(err => {
                console.log(err);
            })
        }, 5000);
    }, []);
    let images = []
    if (data.images) {
        images = data.images.map((imgSrc, index) => (<img src={`data:image/jpeg;base64,${imgSrc}`} alt={'img'} key={data.rows[index].detection_id}/>))
    }
    return (
        <Box>
            <Box>
                {images}
            </Box>
            <Box>
                {count}
            </Box>
            
        </Box>
        
    );
}