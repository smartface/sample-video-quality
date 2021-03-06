import PgVideoRecorderDesign from 'generated/pages/pgVideoRecorder';
import Picker from "sf-core/ui/picker";
import System from 'sf-core/device/system';
import Application from 'sf-core/application';
import Multimedia from 'sf-core/device/multimedia';
import permission from 'sf-extension-utils/lib/permission';
import File from 'sf-core/io/file';
import Share from 'sf-core/global/share';
import { Hardware } from 'sf-core/device';
import AlertView from 'sf-core/ui/alertview';

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

const lowQualityAndroidDevices = [
    'xiaomi',
    'huawei'
];

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

        // @ts-ignore
        this.vwRecord.android.showController = true;
        // @ts-ignore
        this.vwRecord.setControllerEnabled(true);
        this.vwRecord.onReady = () => {
            this.lblDuration.text = `Video duration: ${(this.vwRecord.totalDuration / 1000).toFixed(2)} seconds`;
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
    changeRecordElementsVisible(visible: boolean) {
        this.lblDuration.visible = visible;
        this.lblNewSize.visible = visible;
        this.lblOldSize.visible = visible;
        this.vwRecord.visible = visible;
        this.btnSave.visible = visible;
        this.svVideo.layout.applyLayout();
    }
    okCallback(params: { index: number }) {
        const selectedQuality = qualities[System.OS][params.index];
        if (
            selectedQuality.value === Multimedia.VideoQuality.LOW &&
            lowQualityAndroidDevices.some((device) => Hardware.brandName.toLowerCase().includes(device.toLowerCase()))
        ) {
            const alertView = new AlertView({
                title: "Attention!",
                message: "Because of your device, LOW quality will yield in 144p resolution, which will not be ideal. Smartface recommends using HIGH Quality."
            });
            alertView.addButton({
                index: AlertView.ButtonType.NEGATIVE,
                text: "High",
                onClick: () => {
                    const highQuality = qualities.Android.find(x => x.value === Multimedia.VideoQuality.HIGH);
                    const highQualityIndex = qualities.Android.indexOf(highQuality);
                    this.selectPickerItem(highQuality, highQualityIndex);
                }
            });
            alertView.addButton({
                index: AlertView.ButtonType.POSITIVE,
                text: "Use Low Anyways",
                onClick: () => this.selectPickerItem(selectedQuality, this.index)
            });

            alertView.show();
        } else {
            this.selectPickerItem(selectedQuality, this.index);
        }
    }
    selectPickerItem(selectedQuality: { key: string, value: number }, index: number) {
        this.btnPicker.text = `Quality: ${selectedQuality.key}`;
        this.selectedQuality = selectedQuality.value;
        this.index = index;
    }
    cancelCallback(): void {
        console.log('cancel clicked');
    }
    async startRecording() {
        try {
            this.changeRecordElementsVisible(false);

            await permission.getPermission({
                androidPermission: Application.Android.Permissions.READ_EXTERNAL_STORAGE,
                permissionText: global.lang.fileAccessError
            });
            await permission.getPermission({
                androidPermission: Application.Android.Permissions.CAMERA,
                permissionText: global.lang.cameraPermissionFail,
                iosPermission: permission.IOS_PERMISSIONS.CAMERA
            });

            Multimedia.recordVideo({
                ios: {
                    cameraDevice: System.OS === System.OSType.IOS ? Multimedia.iOS.CameraDevice.FRONT : undefined
                },
                page: this,
                videoQuality: this.selectedQuality,
                onSuccess: ({ video }) => this.recordVideoOnSuccess(video),
                onFailure: ({ message }) => this.recordVideoOnFailure(message)
            });
        } catch (err) {
            console.error(err);
        }
    }
    recordVideoOnSuccess(video: File) {
        this.video = video;

        this.changeRecordElementsVisible(true);

        this.vwRecord.loadFile(this.video);

        this.lblOldSize.text = `Size without SF: ${(this.video.size / (1024 * 1024)).toFixed(2)}MiB`;
        this.lblNewSize.text = 'Calculating...';

        Multimedia.convertToMp4({
            videoFile: this.video,
            outputFileName: `sf-video-${new Date().toISOString().split('.')[0]}`,
            onCompleted: ({ video: convertedVideo }) => this.convertToMp4OnCompleted(convertedVideo),
            onFailure: () => this.convertToMp4OnFailure()
        });
    }
    recordVideoOnFailure(message: string) {
        console.error(message);
    }
    convertToMp4OnCompleted(convertedVideo: File) {
        this.convertedVideo = convertedVideo;
        this.lblNewSize.text = `Size with SF: ${(this.convertedVideo.size / (1024 * 1024)).toFixed(2)}MiB`;
    }
    convertToMp4OnFailure() {
        console.error('An error has occurred when video converting to mp4');
    }
    async shareFile(video: File) {
        try {
            if (System.OS === System.OSType.ANDROID) {
                await permission.getPermission({
                    androidPermission: Application.Android.Permissions.WRITE_EXTERNAL_STORAGE,
                    permissionText: global.lang.fileAccessError
                });
                Share.share({
                    items: [video],
                    page: this,
                    blacklist: []
                });
            }
            else {
                Share.share({
                    items: [video],
                    page: this,
                    blacklist: []
                });
            }
        } catch (err) {
            console.error(err);
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
    this.changeRecordElementsVisible(false);
    this.initPickerItems();
    this.initPicker();
}
