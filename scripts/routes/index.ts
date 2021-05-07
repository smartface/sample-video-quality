import buildExtender from "sf-extension-utils/lib/router/buildExtender";
import {
    NativeRouter as Router,
    NativeStackRouter as StackRouter,
    Route
} from "@smartface/router";
import "sf-extension-utils/lib/router/goBack"; // Implements onBackButtonPressed

const router = Router.of({
    path: "/",
    isRoot: true,
    routes: [
        StackRouter.of({
            path: "/pages",
            routes: [
                Route.of({
                    path: "/pages/pgVideoRecorder",
                    build: buildExtender({ 
                        getPageClass: () => require("pages/pgVideoRecorder").default, 
                        headerBarStyle: { visible: true } 
                    })
                })
            ]
        })
    ]
});

export default router;
