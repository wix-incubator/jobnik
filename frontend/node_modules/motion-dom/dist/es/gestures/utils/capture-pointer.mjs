function capturePointer(event, action) {
    const actionName = `${action}PointerCapture`;
    if (event.target instanceof Element &&
        actionName in event.target &&
        event.pointerId !== undefined) {
        try {
            event.target[actionName](event.pointerId);
        }
        catch (e) { }
    }
}

export { capturePointer };
