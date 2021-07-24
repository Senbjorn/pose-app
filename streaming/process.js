const tf = require('@tensorflow/tfjs-node');
const posenet = require('@tensorflow-models/posenet');
const cv = require('opencv4nodejs');
const canvas = require('canvas');


const frameToCanvas = (frame) => {
    const matRGBA = frame.cvtColor(cv.COLOR_BGR2RGBA);
        const img = new canvas.createImageData(
            new Uint8ClampedArray(matRGBA.getData()),
            frame.cols,
            frame.rows
        );
        
    const cnv = canvas.createCanvas(frame.cols, frame.rows);
    const ctx = cnv.getContext('2d');
    ctx.putImageData(img, 0, 0);
    return cnv;
};

const computePoses = async (model, image) => {
    const input = tf.browser.fromPixels(image);
    const poses = await model.estimateMultiplePoses(input, {
        flipHorizontal: false
    });
    input.dispose();
    return poses;
};

const drawKeyPoints = (poses, image, width, mode) => {
    const ctx = image.getContext('2d');
    for (let i = 0; i < poses.length; i++) {
        let pose = poses[i];
        for (let j = 0; j < pose.keypoints.length; j++) {
            let keypoint = pose.keypoints[j];
            ctx.fillStyle = 'rgba(0,100,255,1)';
            ctx.beginPath();
            if (mode === 'arc') {
                ctx.arc(keypoint.position.x, keypoint.position.y, width, 0, 2 * Math.PI, false);
            }
            if (mode === 'rect') {
                ctx.rect(keypoint.position.x - width / 2, keypoint.position.y - width / 2, width, width)
            }
            ctx.closePath();
            ctx.fill();
        }
    }
}

const drawBoundingBoxes = (poses, image) => {
    const ctx = image.getContext('2d');
    for (let i = 0; i < poses.length; i++) {
        let pose = poses[i];
        let pp = new PoseProcessor(pose);
        let bbox = pp.computeBoundingBox();
        bbox = scaleBoundingBox(bbox, 1.5);
        bbox = clipBoundingBox(bbox, image.width, image.height);
        ctx.strokeStyle = 'rgba(0,255,0,1)';
        ctx.beginPath();
        ctx.moveTo(bbox.x, bbox.y);
        ctx.lineTo(bbox.x + bbox.width, bbox.y);
        ctx.lineTo(bbox.x + bbox.width, bbox.y + bbox.height);
        ctx.lineTo(bbox.x, bbox.y + bbox.height);
        ctx.lineTo(bbox.x, bbox.y);
        ctx.closePath();
        ctx.stroke();
    }
};

const cropBoundingBox = (bbox, image, maxDim) => {
    const c = Math.min(maxDim / bbox.width, maxDim / bbox.height);
    const tw = bbox.width * c;
    const th = bbox.height * c;
    const imageNew = canvas.createCanvas(tw, th);
    const ctxNew = imageNew.getContext('2d');
    ctxNew.drawImage(image, bbox.x, bbox.y, bbox.width, bbox.height, 0, 0, imageNew.width, imageNew.height);
    return imageNew;
};

const cropTransformPoses = (poses, bbox, maxDim) => {
    const c = Math.min(maxDim / bbox.width, maxDim / bbox.height);
    let posesNew = [];
    for (let i = 0; i < poses.length; i++) {
        let pose = poses[i];
        let poseNew = {};
        poseNew['score'] = pose.score;
        poseNew['keypoints'] = [];
        for (let j = 0; j < pose.keypoints.length; j++) {
            let kp = pose.keypoints[j];
            let kpNew = {};
            kpNew['score'] = kp.score;
            kpNew['part'] = kp.part;
            kpNew['position'] = {
                x: (kp.position.x - bbox.x) * c,
                y: (kp.position.y - bbox.y) * c
            }
            poseNew.keypoints.push(kpNew);
        }
        posesNew.push(poseNew);
    }
    return posesNew;
}

const buildPoseIndex = (pose) => {
    let poseIndex = {};
    for (let i = 0; i < pose.keypoints.length; i++) {
        let keypoint = pose.keypoints[i];
        poseIndex[keypoint.part] = keypoint;
    }
    return poseIndex;
};

const scaleBoundingBox = (bbox, scale) => {
    let dx = bbox.width * (1. - scale) / 2;
    let dy = bbox.height * (1. - scale) / 2;
    let new_bbox = {
        x: bbox.x + dx,
        y: bbox.y + dy,
        width: bbox.width * scale,
        height: bbox.height * scale
    }
    return new_bbox;
};

const clipBoundingBox = (bbox, width, height) => {
    let xMin = Math.max(bbox.x, 0);
    let xMax = Math.min(bbox.x + bbox.width, width);
    let yMin = Math.max(bbox.y, 0);
    let yMax = Math.min(bbox.y + bbox.height, height);
    let bboxNew = {
        x: xMin,
        y: yMin,
        width: xMax - xMin,
        height: yMax - yMin
    }
    return bboxNew;
}

class PoseProcessor {
    constructor(pose) {
        this.pose = pose;
        this.poseIndex = buildPoseIndex(pose);
        this.headParts = [
            'nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar'
        ];
        this.wristParts = ['leftWrist', 'rightWrist'];
    }

    getPose() {
        return this.pose;
    }

    computeBoundingBox() {
        let xValues = this.pose.keypoints.map(kp => kp.position.x);
        let yValues = this.pose.keypoints.map(kp => kp.position.y);
        let xMin = Math.min(...xValues);
        let xMax = Math.max(...xValues);
        let yMin = Math.min(...yValues);
        let yMax = Math.max(...yValues);
        let boundingBox = {
            x: xMin,
            y: yMin,
            width: xMax - xMin,
            height: yMax - yMin
        };
        return boundingBox;
    }

    computeHeadPosition() {
        let xHead = [];
        let yHead = [];
        for (const k of this.headParts) {
            if (k in this.poseIndex) {
                xHead.push(this.poseIndex[k].position.x);
                yHead.push(this.poseIndex[k].position.y);
            }
        }
        if (xHead.length > 0) {
            return {
                x: xHead.reduce((p, c) => p + c, 0) / xHead.length,
                y: yHead.reduce((p, c) => p + c, 0) / yHead.length,
            };
        }
        return null;
    }

    checkHandsUp() {
        let result = {}
        result[this.wristParts[0]] = false;
        result[this.wristParts[1]] = false;
        let bbox = this.computeBoundingBox();
        let headPos = this.computeHeadPosition();
        if (headPos !== null) {
            for (const k of this.wristParts) {
                if (k in this.poseIndex) {
                    let keypoint = this.poseIndex[k];
                    if (keypoint.position.y < headPos.y - 0.1 * bbox.height) {
                        result[k] = true;
                    }
                }
            }
        }
        return result;
    }
}

module.exports.frameToCanvas = frameToCanvas;
module.exports.computePoses = computePoses;
module.exports.drawKeyPoints = drawKeyPoints;
module.exports.scaleBoundingBox = scaleBoundingBox;
module.exports.clipBoundingBox = clipBoundingBox;
module.exports.drawBoundingBoxes = drawBoundingBoxes;
module.exports.cropBoundingBox = cropBoundingBox;
module.exports.cropTransformPoses = cropTransformPoses;
module.exports.PoseProcessor = PoseProcessor;