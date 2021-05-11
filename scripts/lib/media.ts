import Multimedia from 'sf-core/device/multimedia';
import File from 'sf-core/io/file';
import System from 'sf-core/device/system';
import Page from 'sf-core/ui/page';

export async function recordVideo(page: Page): Promise<File> {
    return new Promise((res, rej) => {
        Multimedia.recordVideo({
            ios: {
                cameraDevice: System.OS === System.OSType.IOS ? Multimedia.iOS.CameraDevice.FRONT : undefined
            },
            page,
            videoQuality: this.selectedQuality,
            onSuccess: ({ video }) => {
                res(video);
            },
            onFailure: e => {
                rej(e);
            }
        });
    });
}

export async function convertToMp4(video: File): Promise<File> {
    return new Promise((res, rej) => {
        Multimedia.convertToMp4({
            videoFile: video,
            outputFileName: `sf-video-${new Date().toISOString().split('.')[0]}`,
            onCompleted: ({ video: convertedVideo }) => {
                res(convertedVideo);
            },
            onFailure: () => {
                rej('An error has occurred when video converting to mp4');
            }
        });
    });
}

export async function fixVideoOrientation(video: File): Promise<File> {
    return new Promise((res, rej) => {
        //@ts-ignore
        Multimedia.ios._fixVideoOrientation({
            videoFile: video,
            onCompleted: ({ video: orientationFixedVideo }) => {
                res(orientationFixedVideo);
            },
            onFailure: () => {
                rej('An error has occurred changing orientation.')
            }
        });
    });
}