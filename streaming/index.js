const express = require('express');
const cors = require('cors');
const fs  = require('fs');
const app = express();
const dotenv = require('dotenv');
const server = require('http').Server(app);
const io = require('socket.io')(server, {
    cors: {
      origin: '*'
    }
});

const tf = require('@tensorflow/tfjs-node');
const posenet = require('@tensorflow-models/posenet');
const cv = require('opencv4nodejs');
const canvas = require('canvas');

dotenv.config();

// const streamRoute = require('./routes/stream');
const { frameToCanvas, computePoses, drawKeyPoints, drawBoundingBoxes, PoseProcessor, scaleBoundingBox, clipBoundingBox, cropBoundingBox, cropTransformPoses } = require('./process');
const { DBInitializer, createRecord, lastRecords, countRecords } = require('./database');


app.use(cors({credentials: true, origin: true, exposedHeaders: '*'}));
app.use(express.json());

// app.use('/', streamRoute);

const DB_CONFIG = {
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.PGDATABASE,
    databaseTmp: process.env.PGDATABASE_TEMP
}

console.log(DB_CONFIG);

let DB_CONNECT = false;
let DB_INIT = false;

const dbInit = new DBInitializer(DB_CONFIG, 100, 5000);
dbInit.initDB();


app.get('/', (req, res) => {
    return res.sendFile(__dirname + '/index.html');
});


app.get('/handsup', async (req, res) => {
    if (!dbInit.isReady()) {
        return res.status(500).send('');
    }
    const client = dbInit.createClient();
    await client.connect();
    const qres = await lastRecords(client, 10);
    await client.end();
    images = [];
    for (const r of qres) {
        const filePath = __dirname + `/storage/img_${r.detection_id}.jpeg`;
        const buffer = fs.readFileSync(filePath);
        images.push(buffer.toString('base64'));
    }
    return res.send({
        rows: qres,
        images: images
    });
});

app.get('/count', async (req, res) => {
    if (!dbInit.isReady()) {
        return res.status(500).send('');
    }
    const client = dbInit.createClient();
    await client.connect();
    const qres = await countRecords(client);
    await client.end();
    return res.send({
        count: qres
    });
});


const FPS = 30;
const vCap = new cv.VideoCapture(__dirname + '/assets/dance_history.webm');
let net = null;
posenet.load({
    architecture: 'ResNet50',
    outputStride: 32,
    inputResolution: { width: 514, height: 400 },
    quantBytes: 2
}).then(
    (model) => {
        console.log('Model is ready!');
        net = model;
    }
);

const handsUp = async (poses, image) => {
    const ctx = image.getContext('2d');
    for (let i = 0; i < poses.length; i++) {
        let pose = poses[i];
        let pp = new PoseProcessor(pose);
        let hu = pp.checkHandsUp();
        if (hu.leftWrist || hu.rightWrist) {
            const client = dbInit.createClient();
            await client.connect();
            const qres = await createRecord(client);
            await client.end();
            let bbox = pp.computeBoundingBox();
            bbox = scaleBoundingBox(bbox, 1.5);
            bbox = clipBoundingBox(bbox, image.width, image.height);
            const cnv = cropBoundingBox(bbox, image, 100);
            const cropPoses = cropTransformPoses(poses, bbox, 100);
            drawKeyPoints(cropPoses, cnv, 2, 'rect');
            const buffer = cnv.toBuffer('image/jpeg');
            const filePath = __dirname + `/storage/img_${qres}.jpeg`;
            fs.writeFileSync(filePath, buffer);
        }
    }
};


setInterval(
    async () => {
        if (!dbInit.isReady()) {
            return;
        }
        let frame = vCap.read();
        // loop back to start on end of stream reached
        if (frame.empty) {
            vCap.reset();
            frame = vCap.read();
        }
        const cnv = frameToCanvas(frame);
        if (net !== null) {
            const poses = await computePoses(net, cnv);
            await handsUp(poses, cnv);
            drawKeyPoints(poses, cnv, Math.min(cnv.height, cnv.width) / 300, 'arc');
            // drawBoundingBoxes(poses, cnv);
        }
        const imgData = cnv.toBuffer('image/jpeg').toString('base64');
        io.emit('image', imgData);
    },
    1000 / FPS
);

server.listen(process.env.PORT || 3000, () => console.log('Streaming server is up!'));

//sudo docker run --rm --name pg -e POSTGRES_PASSWORD=mysecretpassword -d -p 5432:5432 postgres
//sudo docker stop pg