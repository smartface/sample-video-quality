import PgVideoRecorderDesign from 'generated/pages/pgVideoRecorder';
import Picker from "sf-core/ui/picker";
import System from 'sf-core/device/system';
import { getCombinedStyle } from 'sf-extension-utils/lib/getCombinedStyle';
import Application from 'sf-core/application';
import AttributedString from 'sf-core/ui/attributedstring';
import Dialog from 'sf-core/ui/dialog';
import Multimedia from 'sf-core/device/multimedia';
import pushClassNames from '@smartface/contx/lib/styling/action/pushClassNames';
import permission from 'sf-extension-utils/lib/permission';
import File from 'sf-core/io/file';
import FileStream from 'sf-core/io/filestream';
import Blob from 'sf-core/blob';
import Path from 'sf-core/io/path';
import Share from 'sf-core/share';
import Screen from 'sf-core/device/screen';
import { Hardware } from 'sf-core/device';

const lowQualityAndroidDevices = [
    'xiaomi',
    'huawei'
];

const qualities = {
    iOS: [
        { key: 'Medium', value: Multimedia.VideoQuality.iOS.MEDIUM },
        { key: '640x480', value: Multimedia.VideoQuality.iOS.TYPE640x480 },
        { key: '960x540', value: Multimedia.VideoQuality.iOS.TYPEIFRAME960x540 },
        { key: '1280x720', value: Multimedia.VideoQuality.iOS.TYPEIFRAME1280x720 }
    ],
    Android: [
        { key: 'High', value: Multimedia.VideoQuality.HIGH },
        { key: 'Low', value: Multimedia.VideoQuality.LOW }
    ]
};

export default class PgVideoRecorder extends PgVideoRecorderDesign {
    video: File;
    convertedVideo: File;
    index = 0;
    qualityPicker: Picker;
    qualityPickerItems: string[] = ['item1', 'item2'];
    selectedQuality = -1;

    constructor() {
        super();
        // Overrides super.onShow method
        this.onShow = onShow.bind(this, this.onShow.bind(this));
        // Overrides super.onLoad method
        this.onLoad = onLoad.bind(this, this.onLoad.bind(this));

        this.btnStart.onPress = () => {
            if (this.selectedQuality === -1) {
                alert('You must select a quality');
            } else {
                this.startRecording();
            }
        };

        this.btnSave.onPress = () => {
            this.shareFile(this.convertedVideo);
        };

        this.btnPicker.onPress = () => {
            this.qualityPicker.show(this.okCallback.bind(this), this.cancelCallback.bind(this));
        };
    }
    setText() {
        this.headerBar.title = 'Video Recorder';
    }
    initPicker() {
        this.qualityPicker = new Picker({
            items: this.qualityPickerItems,
            currentIndex: this.index
        });
    }
    initPickerItems() {
        this.qualityPickerItems = [];
        qualities[System.OS].forEach(quality => this.qualityPickerItems.push(quality.key));
    }
    okCallback(params: { index: number }) {
        const selectedQuality = qualities[System.OS][params.index];
        this.btnPicker.text = `Quality: ${selectedQuality.key}`;
        this.selectedQuality = selectedQuality.value;
        this.index = params.index;

        return params;
    }

    cancelCallback(): void {
        console.log('cancel clicked');
    }
    startRecording() {
        this.lblDuration.text = '';
        this.lblNewSize.text = '';
        this.lblOldSize.text = '';

        permission.getPermission({ androidPermission: Application.Android.Permissions.READ_EXTERNAL_STORAGE, permissionText: global.lang.fileAccessError })
            .catch(() => console.log('getPermission - ', global.lang.fileAccessError))
            .then(() => permission.getPermission({
                androidPermission: Application.Android.Permissions.CAMERA,
                permissionText: global.lang.cameraPermissionFail, iosPermission: permission.IOS_PERMISSIONS.CAMERA
            }))
            .then(() => {
                Multimedia.recordVideo({
                    ios: {
                        cameraDevice: System.OS === System.OSType.IOS ?
                            Multimedia.iOS.CameraDevice.FRONT : undefined
                    },
                    page: this,
                    videoQuality: this.selectedQuality,
                    onSuccess: ({ video }) => {
                        this.video = video;
                        // this.lblDuration.text = `Video duration: ${duration.toFixed(2)} seconds`;
                        this.lblOldSize.text = `Size without SF: ${video.size}`;

                        console.log('normal size ', video.size)

                        Multimedia.convertToMp4({
                            videoFile: video,
                            outputFileName: `faceVideo-${new Date().toISOString().split('.')[0]}`,
                            onCompleted: ({ video: convertedVideo }) => {
                                this.convertedVideo = convertedVideo;
                                this.lblNewSize.text = `Size with SF: ${convertedVideo.size}`;
                            },
                            onFailure: () => {
                                console.log('convertMp4Err');
                            }
                        });
                    }
                });
            });
    }
    shareFile(video: File) {
        if (System.OS === System.OSType.ANDROID) {
            permission.getPermission({ androidPermission: Application.Android.Permissions.WRITE_EXTERNAL_STORAGE, permissionText: global.lang.fileAccessError })
                .then(() => {
                    Share.share({
                        items: [video],
                        page: this
                    });
                });
        }
        else {
            Share.share({
                items: [video],
                page: this
            });
        }
    }
}

/**
 * @event onShow
 * This event is called when a page appears on the screen (everytime).
 * @param {function} superOnShow super onShow function
 * @param {Object} parameters passed from Router.go function
 */
function onShow(superOnShow: () => void) {
    superOnShow();
}

/**
 * @event onLoad
 * This event is called once when page is created.
 * @param {function} superOnLoad super onLoad function
 */
function onLoad(superOnLoad: () => void) {
    superOnLoad();
    this.setText();
    this.initPickerItems();
    this.initPicker();
}
