const fs = require('fs');
const router = require('express').Router();
const tf = require('@tensorflow/tfjs-node');
const posenet = require('@tensorflow-models/posenet');
const cv = require('opencv4nodejs');
const canvas = require('canvas');
const Readable = require('stream').Readable;


const FPS = 25;


function drawKeyPoints(poses, ctx) {
    for (let i = 0; i < poses.length; i++) {
        let pose = poses[i];
        for (let j = 0; j < pose.keypoints.length; j++) {
            let keypoint = pose.keypoints[j];
            ctx.fillStyle = 'rgba(0,100,255,0.5)';
            ctx.beginPath();
            ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI, false);
            ctx.fill();
        }
    }
}


class VideoStream extends Readable {
    constructor(src) {
        super();
        this._src = src;
        this._vCap = new cv.VideoCapture(this._src);
    }

    async _read() {
        let frame = this._vCap.read();
        // loop back to start on end of stream reached
        if (frame.empty) {
            this.reset();
            frame = this._vCap.read();
        }
        const imgBuffer = cv.imencode('.jpeg', frame);
        const buffer = Buffer.concat([
            Buffer.from('--frame\r\n'),
            Buffer.from('Content-Type: image/jpeg\r\n\r\n'),
            imgBuffer,
            Buffer.from('\r\n')
        ]);
        this.push(buffer);
    }
}


class PoseStream extends Readable {
    constructor(src, net) {
        super();
        this._src = src;
        this._vCap = new cv.VideoCapture(this._src);
        this._net = net;
    }

    async _read() {
        let frame = this._vCap.read();
        // loop back to start on end of stream reached
        if (frame.empty) {
            this.reset();
            frame = this._vCap.read();
        }
        const matRGBA = frame.cvtColor(cv.COLOR_BGR2RGBA);
        const img = new canvas.createImageData(
            new Uint8ClampedArray(matRGBA.getData()),
            frame.cols,
            frame.rows
        );
        
        const cnv = canvas.createCanvas(frame.cols, frame.rows);
        const ctx = cnv.getContext('2d');
        ctx.putImageData(img, 0, 0);
        const input = tf.browser.fromPixels(cnv);
        const poses = await this._net.estimateMultiplePoses(input, {
            flipHorizontal: false,
            maxDetections: 5,
            scoreThreshold: 0.5,
            nmsRadius: 20
        })
        drawKeyPoints(poses, ctx);
        const imgBuffer = cnv.toBuffer('image/jpeg');
        const buffer = Buffer.concat([
            Buffer.from('--frame\r\n'),
            Buffer.from('Content-Type: image/jpeg\r\n\r\n'),
            imgBuffer,
            Buffer.from('\r\n')
        ]);
        setTimeout(() => { this.push(buffer); }, 1000);        
    }
}




function drawSkeleton(poses, ctx) {
    // Loop through all the skeletons detected
    for (let i = 0; i < poses.length; i++) {
        let skeleton = poses[i].skeleton;
        // For every skeleton, loop through all body connections
        for (let j = 0; j < skeleton.length; j++) {
            let partA = skeleton[j][0];
            let partB = skeleton[j][1];
            ctx.strokeStyle = 'rgba(0,100,255,0.5)';
            ctx.beginPath();
            ctx.lineTo(partA.position.x, partA.position.y);
            ctx.lineTo(partB.position.x, partB.position.x);
            ctx.stroke();
        }
    }
}




router.get('/test', async (req, res) => {
    const vs = new VideoStream(0);
    const headers = {
        'Content-Type': 'multipart/x-mixed-replace; boundary="frame"',
    };
    // HTTP Status 206 for Partial Content
    res.writeHead(200, headers);
    vs.pipe(res);
})

router.get('/stream', async (req, res) => {
    net = await posenet.load({
        architecture: 'ResNet50',
        outputStride: 32,
        inputResolution: { width: 257, height: 200 },
        quantBytes: 2
    });
    const poseStream = new PoseStream(0, net);
    poseStream.on('data', (chunk) => {
        // console.log(chunk.toString('utf8'));
    });
    const headers = {
        'Content-Type': 'multipart/x-mixed-replace; boundary="frame"',
    };
    // HTTP Status 206 for Partial Content
    res.writeHead(200, headers);
    poseStream.pipe(res);
    // const videoPath = __dirname + '/../assets/dance_history.webm'; //'/home/semyon/Projects/wardenmachinery_pose/streaming/assets/dance_history.webm'
    // console.log(videoPath);
    // let vCap = new cv.VideoCapture(0);
    // const net = await posenet.load({
    //     architecture: 'ResNet50',
    //     outputStride: 32,
    //     inputResolution: { width: 257, height: 200 },
    //     quantBytes: 2
    // });
    // let frameNumber = 0;
    // while (true) {
    //     let frame = vCap.read();
    //     // loop back to start on end of stream reached
    //     if (frame.empty) {
    //         vCap.reset();
    //         frame = vCap.read();
    //         break;
    //     }

    //     const matRGBA = frame.cvtColor(cv.COLOR_BGR2RGBA);
    //     const img = new canvas.createImageData(
    //         new Uint8ClampedArray(matRGBA.getData()),
    //         frame.cols,
    //         frame.rows
    //     );
        
    //     const cnv = canvas.createCanvas(frame.cols, frame.rows);
    //     const ctx = cnv.getContext('2d');
    //     ctx.putImageData(img, 0, 0);
    //     const input = tf.browser.fromPixels(cnv);

    //     const poses = await net.estimateMultiplePoses(input, {
    //         flipHorizontal: false,
    //         maxDetections: 5,
    //         scoreThreshold: 0.5,
    //         nmsRadius: 20
    //     });
    //     console.log(frameNumber + 1);
    //     // ctx.arc(25, 25, 10, 0, Math.PI, false);
    //     ctx.fill();
    //     drawKeyPoints(poses, ctx);
    //     frameNumber += 1;

    //     const buffer = cnv.toBuffer('image/png');
    //     fs.writeFileSync('./image.png', buffer);
    // }
      // Ensure there is a range given for the video
    // const range = req.headers.range;
    // if (!range) {
    //     res.status(400).send("Requires Range header");
    // }

    // // get video stats (about 61MB)
    // const videoPath = __dirname + "/../assets/dance_history.webm";
    // const videoSize = fs.statSync(videoPath).size;

    // // Parse Range
    // // Example: "bytes=32324-"
    // const CHUNK_SIZE = 10 ** 6; // 1MB
    // const start = Number(range.replace(/\D/g, ""));
    // const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    // // Create headers
    // const contentLength = end - start + 1;
    // const headers = {
    //     "Content-Range": `bytes ${start}-${end}/${videoSize}`,
    //     "Accept-Ranges": "bytes",
    //     "Content-Length": contentLength,
    //     "Content-Type": "video/mp4",
    // };

    // // HTTP Status 206 for Partial Content
    // res.writeHead(206, headers);

    // // create video read stream for this particular chunk
    // const videoStream = fs.createReadStream(videoPath, { start, end });
    // const poses = await net.estimateMultiplePoses(image, {
    //     flipHorizontal: false,
    //     maxDetections: 5,
    //     scoreThreshold: 0.5,
    //     nmsRadius: 20
    // });
    // // Stream the video chunk to the client
    // videoStream.pipe(res);
});

module.exports = router;
