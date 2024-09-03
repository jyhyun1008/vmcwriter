const osc = require('osc')
const Quaternion = require('quaternion');
const fs = require('node:fs');
const path = require('path');
const configArray = fs.readFileSync(path.join(process.cwd(), 'vmcwriter/config.txt')).toString().split("\n");
const DESTIP = configArray[2].replace('\r', '')
const PORT = configArray[5].replace('\r', '')
let pushFrame

var hieray = Array.from({length: 168}, () => '0.000000');

var frame = [];
var recordstart = false

const HIER = ['Root_Pos', 'Root', 'Hips', 'Spine', 'Chest', 'UpperChest', 'Neck', 'Head', 'LeftEye', 'RightEye', 'LeftShoulder', 'LeftUpperArm', 'LeftLowerArm', 'LeftHand', 'LeftIndexProximal', 'LeftIndexIntermediate', 'LeftIndexDistal', 'LeftLittleProximal', 'LeftLittleIntermediate', 'LeftLittleDistal', 'LeftMiddleProximal', 'LeftMiddleIntermediate', 'LeftMiddleDistal', 'LeftRingProximal', 'LeftRingIntermediate', 'LeftRingDistal', 'LeftThumbProximal', 'LeftThumbIntermediate', 'LeftThumbDistal', 'RightShoulder', 'RightUpperArm', 'RightLowerArm', 'RightHand', 'RightIndexProximal', 'RightIndexIntermediate', 'RightIndexDistal', 'RightLittleProximal', 'RightLittleIntermediate', 'RightLittleDistal', 'RightMiddleProximal', 'RightMiddleIntermediate', 'RightMiddleDistal', 'RightRingProximal', 'RightRingIntermediate', 'RightRingDistal', 'RightThumbProximal', 'RightThumbIntermediate', 'RightThumbDistal', 'LeftUpperLeg', 'LeftLowerLeg', 'LeftFoot', 'LeftToes', 'RightUpperLeg', 'RightLowerLeg', 'RightFoot', 'RightToes']

var getIPAddresses = function () {
    var os = require("os"),
        interfaces = os.networkInterfaces(),
        ipAddresses = [];

    for (var deviceName in interfaces) {
        var addresses = interfaces[deviceName];
        for (var i = 0; i < addresses.length; i++) {
            var addressInfo = addresses[i];
            if (addressInfo.family === "IPv4" && !addressInfo.internal) {
                ipAddresses.push(addressInfo.address);
            }
        }
    }
    return ipAddresses;
};

var recPort = new osc.UDPPort({
    localAddress: DESTIP,
    localPort: PORT
});

recPort.on("ready", function () {
    var ipAddresses = getIPAddresses();
    ipAddresses.forEach(function (address) {
        console.log("Port Connection On: ", recPort.options.localPort);
    });
    pushFrame = setInterval(() => {
        if (recordstart) {
            frame.push(hieray.join('	'))
        }
    }, 1000/30, hieray);
});


function qtod_rot(r11, r12, r21, r31, r32) {
    F = (180.0 / Math.PI);

	// zyx
	var zrot   = Math.atan2(r31, r32) * F;
	var yrot = Math.asin(r21) * F;
	var xrot  = Math.atan2(r11, r12) * F;

    return [xrot, yrot, zrot]
}

function qtod(x, y, z, w) {

    var angles = qtod_rot(-2 * (y * z - w * x), w * w - x * x - y * y + z * z, 2 * (x * z + w * y), -2 * (x * y - w * z), w * w + x * x - y * y - z * z);

    return angles
}

function record(oscMessage) {

    if (oscMessage.address == '/VMC/Ext/Bone/Pos') {
        let part = oscMessage.args[0]
        let partIndex = HIER.indexOf(part)
        let euler = qtod(oscMessage.args[4], -1*oscMessage.args[5], -1*oscMessage.args[6], 1*oscMessage.args[7])

        for (let i=0; i<3;i++) {
            if (euler[i] >= 0) {
                hieray[partIndex*3+i] = ' '+(euler[i]).toFixed(6)
            } else {
                hieray[partIndex*3+i] = (euler[i]).toFixed(6)
            }
        }
    } else if (oscMessage.address == '/VMC/Ext/Root/Pos') {
        // let qmul = new Quaternion(oscMessage.args[7], -1*oscMessage.args[4], -1*oscMessage.args[5], 1*oscMessage.args[6]).mul(oscMessage.args[7], -1*oscMessage.args[4], -1*oscMessage.args[5], 1*oscMessage.args[6])
        // qxyz = qmul.imag()
        // qw = qmul.real()

        let euler = qtod(oscMessage.args[4], -1*oscMessage.args[5], -1*oscMessage.args[6], 1*oscMessage.args[7])
        //let euler = qtod(qxyz[0], qxyz[1], qxyz[2], qw)
        hieray[2] = (-1*oscMessage.args[1]).toFixed(6)
        hieray[0] = (oscMessage.args[3]).toFixed(6)
        hieray[1] = (oscMessage.args[2]).toFixed(6)
        for (let i=0; i<3;i++) {
            if (euler[i] >= 0) {
                hieray[3+i] = ' '+(euler[i]).toFixed(6)
            } else {
                hieray[3+i] = (euler[i]).toFixed(6)
            }
        }
    }
}

recPort.on("message", function (oscMessage) {
    if (!recordstart) {
        recordstart = true
    }
    record(oscMessage)
})

recPort.open()

process.on('SIGINT', function() {
    clearInterval(pushFrame)
    var content = `HIERARCHY\nROOT Root\n{\n	OFFSET 0.00 0.00 0.00\n	CHANNELS 6 Xposition Yposition Zposition Xrotation Yrotation Zrotation\n	JOINT Hips\n	{\n		OFFSET	0.00	1.00	0.00\n		CHANNELS 3 Xrotation Yrotation Zrotation\n		JOINT Spine\n		{\n			OFFSET	-0.009727	 0.052128	 0.000000\n			CHANNELS 3 Xrotation Yrotation Zrotation\n			JOINT Chest\n			{\n				OFFSET	-0.014510	 0.110886	 0.000000\n				CHANNELS 3 Xrotation Yrotation Zrotation\n				JOINT UpperChest\n				{\n					OFFSET	-0.013313	 0.124285	 0.000000\n					CHANNELS 3 Xrotation Yrotation Zrotation\n					JOINT Neck\n					{\n						OFFSET	-0.033396	 0.114615	 0.000000\n						CHANNELS 3 Xrotation Yrotation Zrotation\n						JOINT Head\n						{\n							OFFSET	-0.009335	 0.073770	 0.000000\n							CHANNELS 3 Xrotation Yrotation Zrotation\n							JOINT LeftEye\n							{\n								OFFSET	-0.028383	 0.059252	 0.020036\n								CHANNELS 3 Xrotation Yrotation Zrotation\n								End Site\n								{\n									OFFSET	-0.028383	 0.059252	 0.020036\n								}\n							}\n							JOINT RightEye\n							{\n								OFFSET	-0.028383	 0.059252	-0.020036\n								CHANNELS 3 Xrotation Yrotation Zrotation\n								End Site\n								{\n									OFFSET	-0.028383	 0.059252	-0.020036\n								}\n							}\n						}\n					}\n					JOINT LeftShoulder\n					{\n						OFFSET	 0.022386	 0.027443	 0.087264\n						CHANNELS 3 Xrotation Yrotation Zrotation\n						JOINT LeftUpperArm\n						{\n							OFFSET	 0.086295	-0.005364	-0.014869\n							CHANNELS 3 Xrotation Yrotation Zrotation\n							JOINT LeftLowerArm\n							{\n								OFFSET	 0.210165	-0.001763	-0.009786\n								CHANNELS 3 Xrotation Yrotation Zrotation\n								JOINT LeftHand\n								{\n									OFFSET	 0.204753	-0.016902	-0.000446\n									CHANNELS 3 Xrotation Yrotation Zrotation\n									JOINT LeftIndexProximal\n									{\n										OFFSET	 0.063906	-0.021442	 0.005562\n										CHANNELS 3 Xrotation Yrotation Zrotation\n										JOINT LeftIndexIntermediate\n										{\n											OFFSET	 0.032821	-0.005149	-0.000134\n											CHANNELS 3 Xrotation Yrotation Zrotation\n											JOINT LeftIndexDistal\n											{\n												OFFSET	 0.020314	-0.002301	-0.000674\n												CHANNELS 3 Xrotation Yrotation Zrotation\n												End Site\n												{\n													OFFSET	 0.020314	-0.002301	-0.000674\n												}\n											}\n										}\n									}\n									JOINT LeftLittleProximal\n									{\n										OFFSET	 0.063261	 0.026794	 0.003125\n										CHANNELS 3 Xrotation Yrotation Zrotation\n										JOINT LeftLittleIntermediate\n										{\n											OFFSET	 0.031398	-0.000022	-0.000273\n											CHANNELS 3 Xrotation Yrotation Zrotation\n											JOINT LeftLittleDistal\n											{\n												OFFSET	 0.018059	 0.000943	 0.000679\n												CHANNELS 3 Xrotation Yrotation Zrotation\n												End Site\n												{\n													OFFSET	 0.018059	 0.000943	 0.000679\n												}\n											}\n										}\n									}\n									JOINT LeftMiddleProximal\n									{\n										OFFSET	 0.066112	-0.004780	 0.008373\n										CHANNELS 3 Xrotation Yrotation Zrotation\n										JOINT LeftMiddleIntermediate\n										{\n											OFFSET	 0.036901	-0.002438	-0.001349\n											CHANNELS 3 Xrotation Yrotation Zrotation\n											JOINT LeftMiddleDistal\n											{\n												OFFSET	 0.022683	-0.000937	-0.002405\n												CHANNELS 3 Xrotation Yrotation Zrotation\n												End Site\n												{\n													OFFSET	 0.022683	-0.000937	-0.002405\n												}\n											}\n										}\n									}\n									JOINT LeftRingProximal\n									{\n										OFFSET	 0.066681	 0.010961	 0.008306\n										CHANNELS 3 Xrotation Yrotation Zrotation\n										JOINT LeftRingIntermediate\n										{\n											OFFSET	 0.034323	-0.000172	-0.000538\n											CHANNELS 3 Xrotation Yrotation Zrotation\n											JOINT LeftRingDistal\n											{\n												OFFSET	 0.019797	-0.000249	 0.000700\n												CHANNELS 3 Xrotation Yrotation Zrotation\n												End Site\n												{\n													OFFSET	 0.019797	-0.000249	 0.000700\n												}\n											}\n										}\n									}\n									JOINT LeftThumbProximal\n									{\n										OFFSET	 0.002032	-0.017734	-0.006912\n										CHANNELS 3 Xrotation Yrotation Zrotation\n										JOINT LeftThumbIntermediate\n										{\n											OFFSET	 0.032287	-0.033401	-0.002701\n											CHANNELS 3 Xrotation Yrotation Zrotation\n											JOINT LeftThumbDistal\n											{\n												OFFSET	 0.021324	-0.019035	-0.001512\n												CHANNELS 3 Xrotation Yrotation Zrotation\n												End Site\n												{\n													OFFSET	 0.021324	-0.019035	-0.001512\n												}\n											}\n										}\n									}\n								}\n							}\n						}\n					}\n					JOINT RightShoulder\n					{\n						OFFSET	-0.022386	 0.027443	 0.087267\n						CHANNELS 3 Xrotation Yrotation Zrotation\n						JOINT RightUpperArm\n						{\n							OFFSET	-0.086294	-0.005364	-0.014870\n							CHANNELS 3 Xrotation Yrotation Zrotation\n							JOINT RightLowerArm\n							{\n								OFFSET	-0.210167	-0.001763	-0.009788\n								CHANNELS 3 Xrotation Yrotation Zrotation\n								JOINT RightHand\n								{\n									OFFSET	-0.204752	-0.016902	-0.000445\n									CHANNELS 3 Xrotation Yrotation Zrotation\n									JOINT RightIndexProximal\n									{\n										OFFSET	-0.063906	-0.021442	 0.005562\n										CHANNELS 3 Xrotation Yrotation Zrotation\n										JOINT RightIndexIntermediate\n										{\n											OFFSET	-0.032821	-0.005149	-0.000134\n											CHANNELS 3 Xrotation Yrotation Zrotation\n											JOINT RightIndexDistal\n											{\n												OFFSET	-0.020314	-0.002302	-0.000674\n												CHANNELS 3 Xrotation Yrotation Zrotation\n												End Site\n												{\n													OFFSET	-0.020314	-0.002302	-0.000674\n												}\n											}\n										}\n									}\n									JOINT RightLittleProximal\n									{\n										OFFSET	-0.063261	 0.026794	 0.003125\n										CHANNELS 3 Xrotation Yrotation Zrotation\n										JOINT RightLittleIntermediate\n										{\n											OFFSET	-0.031398	-0.000023	-0.000273\n											CHANNELS 3 Xrotation Yrotation Zrotation\n											JOINT RightLittleDistal\n											{\n												OFFSET	-0.018059	 0.000943	 0.000679\n												CHANNELS 3 Xrotation Yrotation Zrotation\n												End Site\n												{\n													OFFSET	-0.018059	 0.000943	 0.000679\n												}\n											}\n										}\n									}\n									JOINT RightMiddleProximal\n									{\n										OFFSET	-0.066112	-0.004780	 0.008373\n										CHANNELS 3 Xrotation Yrotation Zrotation\n										JOINT RightMiddleIntermediate\n										{\n											OFFSET	-0.036901	-0.002438	-0.001349\n											CHANNELS 3 Xrotation Yrotation Zrotation\n											JOINT RightMiddleDistal\n											{\n												OFFSET	-0.022683	-0.000937	-0.002405\n												CHANNELS 3 Xrotation Yrotation Zrotation\n												End Site\n												{\n													OFFSET	-0.022683	-0.000937	-0.002405\n												}\n											}\n										}\n									}\n									JOINT RightRingProximal\n									{\n										OFFSET	-0.066681	 0.010961	 0.008306\n										CHANNELS 3 Xrotation Yrotation Zrotation\n										JOINT RightRingIntermediate\n										{\n											OFFSET	-0.034323	-0.000173	-0.000538\n											CHANNELS 3 Xrotation Yrotation Zrotation\n											JOINT RightRingDistal\n											{\n												OFFSET	-0.019796	-0.000249	 0.000700\n												CHANNELS 3 Xrotation Yrotation Zrotation\n												End Site\n												{\n													OFFSET	-0.019796	-0.000249	 0.000700\n												}\n											}\n										}\n									}\n									JOINT RightThumbProximal\n									{\n										OFFSET	-0.002032	-0.017734	-0.006912\n										CHANNELS 3 Xrotation Yrotation Zrotation\n										JOINT RightThumbIntermediate\n										{\n											OFFSET	-0.032277	-0.033413	-0.002678\n											CHANNELS 3 Xrotation Yrotation Zrotation\n											JOINT RightThumbDistal\n											{\n												OFFSET	-0.021319	-0.019040	-0.001499\n												CHANNELS 3 Xrotation Yrotation Zrotation\n												End Site\n												{\n													OFFSET	-0.021319	-0.019040	-0.001499\n												}\n											}\n										}\n									}\n								}\n							}\n						}\n					}\n				}\n			}\n		}\n		JOINT LeftUpperLeg\n		{\n			OFFSET	 0.077122	-0.039702	 0.004909\n			CHANNELS 3 Xrotation Yrotation Zrotation\n			JOINT LeftLowerLeg\n			{\n				OFFSET	 0.006634	-0.342480	-0.019634\n				CHANNELS 3 Xrotation Yrotation Zrotation\n				JOINT LeftFoot\n				{\n					OFFSET	 0.020943	-0.401580	-0.010011\n					CHANNELS 3 Xrotation Yrotation Zrotation\n					JOINT LeftToes\n					{\n						OFFSET	 0.001443	-0.064447	0.110538\n						CHANNELS 3 Xrotation Yrotation Zrotation\n						End Site\n						{\n							OFFSET	 0.001443	-0.064447	0.110538\n						}\n					}\n				}\n			}\n		}\n		JOINT RightUpperLeg\n		{\n			OFFSET	-0.077122	-0.039702	 0.004909\n			CHANNELS 3 Xrotation Yrotation Zrotation\n			JOINT RightLowerLeg\n			{\n				OFFSET	 0.006634	-0.342480	 0.019634\n				CHANNELS 3 Xrotation Yrotation Zrotation\n				JOINT RightFoot\n				{\n					OFFSET	 0.020943	-0.401580	 0.010012\n					CHANNELS 3 Xrotation Yrotation Zrotation\n					JOINT RightToes\n					{\n						OFFSET	-0.001442	-0.064447	0.110538\n						CHANNELS 3 Xrotation Yrotation Zrotation\n						End Site\n						{\n							OFFSET	-0.001442	-0.064447	0.110538\n						}\n					}\n				}\n			}\n		}\n	}\n}\nMOTION\nFrames:    ${frame.length}\nFrame Time: 0.03333334`;

    fs.writeFile(path.join(process.cwd(), 'vmcwriter/result.bvh'), content + '\n' + frame.join('\n'), err => {
        if (err) {
            console.error(err);
        } else {
            console.log("Frame Length: ", frame.length)
        }
    });
    setTimeout(() => {
        process.exit();
    }, 1000);
});