(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('motion-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', 'motion-utils'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.MotionDom = {}, global.MotionUtils));
})(this, (function (exports, motionUtils) { 'use strict';

    const supportsScrollTimeline = /* @__PURE__ */ motionUtils.memo(() => window.ScrollTimeline !== undefined);

    class BaseGroupPlaybackControls {
        constructor(animations) {
            // Bound to accomodate common `return animation.stop` pattern
            this.stop = () => this.runAll("stop");
            this.animations = animations.filter(Boolean);
        }
        get finished() {
            // Support for new finished Promise and legacy thennable API
            return Promise.all(this.animations.map((animation) => "finished" in animation ? animation.finished : animation));
        }
        /**
         * TODO: Filter out cancelled or stopped animations before returning
         */
        getAll(propName) {
            return this.animations[0][propName];
        }
        setAll(propName, newValue) {
            for (let i = 0; i < this.animations.length; i++) {
                this.animations[i][propName] = newValue;
            }
        }
        attachTimeline(timeline, fallback) {
            const subscriptions = this.animations.map((animation) => {
                if (supportsScrollTimeline() && animation.attachTimeline) {
                    return animation.attachTimeline(timeline);
                }
                else if (typeof fallback === "function") {
                    return fallback(animation);
                }
            });
            return () => {
                subscriptions.forEach((cancel, i) => {
                    cancel && cancel();
                    this.animations[i].stop();
                });
            };
        }
        get time() {
            return this.getAll("time");
        }
        set time(time) {
            this.setAll("time", time);
        }
        get speed() {
            return this.getAll("speed");
        }
        set speed(speed) {
            this.setAll("speed", speed);
        }
        get startTime() {
            return this.getAll("startTime");
        }
        get duration() {
            let max = 0;
            for (let i = 0; i < this.animations.length; i++) {
                max = Math.max(max, this.animations[i].duration);
            }
            return max;
        }
        runAll(methodName) {
            this.animations.forEach((controls) => controls[methodName]());
        }
        flatten() {
            this.runAll("flatten");
        }
        play() {
            this.runAll("play");
        }
        pause() {
            this.runAll("pause");
        }
        cancel() {
            this.runAll("cancel");
        }
        complete() {
            this.runAll("complete");
        }
    }

    /**
     * TODO: This is a temporary class to support the legacy
     * thennable API
     */
    class GroupPlaybackControls extends BaseGroupPlaybackControls {
        then(onResolve, onReject) {
            return Promise.all(this.animations).then(onResolve).catch(onReject);
        }
    }

    function getValueTransition(transition, key) {
        return transition
            ? transition[key] ||
                transition["default"] ||
                transition
            : undefined;
    }

    /**
     * Implement a practical max duration for keyframe generation
     * to prevent infinite loops
     */
    const maxGeneratorDuration = 20000;
    function calcGeneratorDuration(generator) {
        let duration = 0;
        const timeStep = 50;
        let state = generator.next(duration);
        while (!state.done && duration < maxGeneratorDuration) {
            duration += timeStep;
            state = generator.next(duration);
        }
        return duration >= maxGeneratorDuration ? Infinity : duration;
    }

    /**
     * Create a progress => progress easing function from a generator.
     */
    function createGeneratorEasing(options, scale = 100, createGenerator) {
        const generator = createGenerator({ ...options, keyframes: [0, scale] });
        const duration = Math.min(calcGeneratorDuration(generator), maxGeneratorDuration);
        return {
            type: "keyframes",
            ease: (progress) => {
                return generator.next(duration * progress).value / scale;
            },
            duration: motionUtils.millisecondsToSeconds(duration),
        };
    }

    function isGenerator(type) {
        return typeof type === "function";
    }

    function attachTimeline(animation, timeline) {
        animation.timeline = timeline;
        animation.onfinish = null;
    }

    class NativeAnimationControls {
        constructor(animation) {
            this.animation = animation;
        }
        get duration() {
            var _a, _b, _c;
            const durationInMs = ((_b = (_a = this.animation) === null || _a === void 0 ? void 0 : _a.effect) === null || _b === void 0 ? void 0 : _b.getComputedTiming().duration) ||
                ((_c = this.options) === null || _c === void 0 ? void 0 : _c.duration) ||
                300;
            return motionUtils.millisecondsToSeconds(Number(durationInMs));
        }
        get time() {
            var _a;
            if (this.animation) {
                return motionUtils.millisecondsToSeconds(((_a = this.animation) === null || _a === void 0 ? void 0 : _a.currentTime) || 0);
            }
            return 0;
        }
        set time(newTime) {
            if (this.animation) {
                this.animation.currentTime = motionUtils.secondsToMilliseconds(newTime);
            }
        }
        get speed() {
            return this.animation ? this.animation.playbackRate : 1;
        }
        set speed(newSpeed) {
            if (this.animation) {
                this.animation.playbackRate = newSpeed;
            }
        }
        get state() {
            return this.animation ? this.animation.playState : "finished";
        }
        get startTime() {
            return this.animation ? this.animation.startTime : null;
        }
        get finished() {
            return this.animation ? this.animation.finished : Promise.resolve();
        }
        play() {
            this.animation && this.animation.play();
        }
        pause() {
            this.animation && this.animation.pause();
        }
        stop() {
            if (!this.animation ||
                this.state === "idle" ||
                this.state === "finished") {
                return;
            }
            if (this.animation.commitStyles) {
                this.animation.commitStyles();
            }
            this.cancel();
        }
        flatten() {
            var _a, _b;
            if (!this.animation || !((_a = this.options) === null || _a === void 0 ? void 0 : _a.allowFlatten))
                return;
            (_b = this.animation.effect) === null || _b === void 0 ? void 0 : _b.updateTiming({ easing: "linear" });
        }
        attachTimeline(timeline) {
            if (this.animation)
                attachTimeline(this.animation, timeline);
            return motionUtils.noop;
        }
        complete() {
            this.animation && this.animation.finish();
        }
        cancel() {
            try {
                this.animation && this.animation.cancel();
            }
            catch (e) { }
        }
    }

    const isBezierDefinition = (easing) => Array.isArray(easing) && typeof easing[0] === "number";

    /**
     * Add the ability for test suites to manually set support flags
     * to better test more environments.
     */
    const supportsFlags = {
        linearEasing: undefined,
    };

    function memoSupports(callback, supportsFlag) {
        const memoized = motionUtils.memo(callback);
        return () => { var _a; return (_a = supportsFlags[supportsFlag]) !== null && _a !== void 0 ? _a : memoized(); };
    }

    const supportsLinearEasing = /*@__PURE__*/ memoSupports(() => {
        try {
            document
                .createElement("div")
                .animate({ opacity: 0 }, { easing: "linear(0, 1)" });
        }
        catch (e) {
            return false;
        }
        return true;
    }, "linearEasing");

    const generateLinearEasing = (easing, duration, // as milliseconds
    resolution = 10 // as milliseconds
    ) => {
        let points = "";
        const numPoints = Math.max(Math.round(duration / resolution), 2);
        for (let i = 0; i < numPoints; i++) {
            points += easing(motionUtils.progress(0, numPoints - 1, i)) + ", ";
        }
        return `linear(${points.substring(0, points.length - 2)})`;
    };

    function isWaapiSupportedEasing(easing) {
        return Boolean((typeof easing === "function" && supportsLinearEasing()) ||
            !easing ||
            (typeof easing === "string" &&
                (easing in supportedWaapiEasing || supportsLinearEasing())) ||
            isBezierDefinition(easing) ||
            (Array.isArray(easing) && easing.every(isWaapiSupportedEasing)));
    }
    const cubicBezierAsString = ([a, b, c, d]) => `cubic-bezier(${a}, ${b}, ${c}, ${d})`;
    const supportedWaapiEasing = {
        linear: "linear",
        ease: "ease",
        easeIn: "ease-in",
        easeOut: "ease-out",
        easeInOut: "ease-in-out",
        circIn: /*@__PURE__*/ cubicBezierAsString([0, 0.65, 0.55, 1]),
        circOut: /*@__PURE__*/ cubicBezierAsString([0.55, 0, 1, 0.45]),
        backIn: /*@__PURE__*/ cubicBezierAsString([0.31, 0.01, 0.66, -0.59]),
        backOut: /*@__PURE__*/ cubicBezierAsString([0.33, 1.53, 0.69, 0.99]),
    };
    function mapEasingToNativeEasing(easing, duration) {
        if (!easing) {
            return undefined;
        }
        else if (typeof easing === "function" && supportsLinearEasing()) {
            return generateLinearEasing(easing, duration);
        }
        else if (isBezierDefinition(easing)) {
            return cubicBezierAsString(easing);
        }
        else if (Array.isArray(easing)) {
            return easing.map((segmentEasing) => mapEasingToNativeEasing(segmentEasing, duration) ||
                supportedWaapiEasing.easeOut);
        }
        else {
            return supportedWaapiEasing[easing];
        }
    }

    const stepsOrder = [
        "read", // Read
        "resolveKeyframes", // Write/Read/Write/Read
        "update", // Compute
        "preRender", // Compute
        "render", // Write
        "postRender", // Compute
    ];

    const statsBuffer = {
        value: null,
        addProjectionMetrics: null,
    };

    function createRenderStep(runNextFrame, stepName) {
        /**
         * We create and reuse two queues, one to queue jobs for the current frame
         * and one for the next. We reuse to avoid triggering GC after x frames.
         */
        let thisFrame = new Set();
        let nextFrame = new Set();
        /**
         * Track whether we're currently processing jobs in this step. This way
         * we can decide whether to schedule new jobs for this frame or next.
         */
        let isProcessing = false;
        let flushNextFrame = false;
        /**
         * A set of processes which were marked keepAlive when scheduled.
         */
        const toKeepAlive = new WeakSet();
        let latestFrameData = {
            delta: 0.0,
            timestamp: 0.0,
            isProcessing: false,
        };
        let numCalls = 0;
        function triggerCallback(callback) {
            if (toKeepAlive.has(callback)) {
                step.schedule(callback);
                runNextFrame();
            }
            numCalls++;
            callback(latestFrameData);
        }
        const step = {
            /**
             * Schedule a process to run on the next frame.
             */
            schedule: (callback, keepAlive = false, immediate = false) => {
                const addToCurrentFrame = immediate && isProcessing;
                const queue = addToCurrentFrame ? thisFrame : nextFrame;
                if (keepAlive)
                    toKeepAlive.add(callback);
                if (!queue.has(callback))
                    queue.add(callback);
                return callback;
            },
            /**
             * Cancel the provided callback from running on the next frame.
             */
            cancel: (callback) => {
                nextFrame.delete(callback);
                toKeepAlive.delete(callback);
            },
            /**
             * Execute all schedule callbacks.
             */
            process: (frameData) => {
                latestFrameData = frameData;
                /**
                 * If we're already processing we've probably been triggered by a flushSync
                 * inside an existing process. Instead of executing, mark flushNextFrame
                 * as true and ensure we flush the following frame at the end of this one.
                 */
                if (isProcessing) {
                    flushNextFrame = true;
                    return;
                }
                isProcessing = true;
                [thisFrame, nextFrame] = [nextFrame, thisFrame];
                // Execute this frame
                thisFrame.forEach(triggerCallback);
                /**
                 * If we're recording stats then
                 */
                if (stepName && statsBuffer.value) {
                    statsBuffer.value.frameloop[stepName].push(numCalls);
                }
                numCalls = 0;
                // Clear the frame so no callbacks remain. This is to avoid
                // memory leaks should this render step not run for a while.
                thisFrame.clear();
                isProcessing = false;
                if (flushNextFrame) {
                    flushNextFrame = false;
                    step.process(frameData);
                }
            },
        };
        return step;
    }

    const maxElapsed = 40;
    function createRenderBatcher(scheduleNextBatch, allowKeepAlive) {
        let runNextFrame = false;
        let useDefaultElapsed = true;
        const state = {
            delta: 0.0,
            timestamp: 0.0,
            isProcessing: false,
        };
        const flagRunNextFrame = () => (runNextFrame = true);
        const steps = stepsOrder.reduce((acc, key) => {
            acc[key] = createRenderStep(flagRunNextFrame, allowKeepAlive ? key : undefined);
            return acc;
        }, {});
        const { read, resolveKeyframes, update, preRender, render, postRender } = steps;
        const processBatch = () => {
            const timestamp = motionUtils.MotionGlobalConfig.useManualTiming
                ? state.timestamp
                : performance.now();
            runNextFrame = false;
            if (!motionUtils.MotionGlobalConfig.useManualTiming) {
                state.delta = useDefaultElapsed
                    ? 1000 / 60
                    : Math.max(Math.min(timestamp - state.timestamp, maxElapsed), 1);
            }
            state.timestamp = timestamp;
            state.isProcessing = true;
            // Unrolled render loop for better per-frame performance
            read.process(state);
            resolveKeyframes.process(state);
            update.process(state);
            preRender.process(state);
            render.process(state);
            postRender.process(state);
            state.isProcessing = false;
            if (runNextFrame && allowKeepAlive) {
                useDefaultElapsed = false;
                scheduleNextBatch(processBatch);
            }
        };
        const wake = () => {
            runNextFrame = true;
            useDefaultElapsed = true;
            if (!state.isProcessing) {
                scheduleNextBatch(processBatch);
            }
        };
        const schedule = stepsOrder.reduce((acc, key) => {
            const step = steps[key];
            acc[key] = (process, keepAlive = false, immediate = false) => {
                if (!runNextFrame)
                    wake();
                return step.schedule(process, keepAlive, immediate);
            };
            return acc;
        }, {});
        const cancel = (process) => {
            for (let i = 0; i < stepsOrder.length; i++) {
                steps[stepsOrder[i]].cancel(process);
            }
        };
        return { schedule, cancel, state, steps };
    }

    const { schedule: frame, cancel: cancelFrame, state: frameData, steps: frameSteps, } = /* @__PURE__ */ createRenderBatcher(typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame : motionUtils.noop, true);

    const { schedule: microtask, cancel: cancelMicrotask } = 
    /* @__PURE__ */ createRenderBatcher(queueMicrotask, false);

    let now;
    function clearTime() {
        now = undefined;
    }
    /**
     * An eventloop-synchronous alternative to performance.now().
     *
     * Ensures that time measurements remain consistent within a synchronous context.
     * Usually calling performance.now() twice within the same synchronous context
     * will return different values which isn't useful for animations when we're usually
     * trying to sync animations to the same frame.
     */
    const time = {
        now: () => {
            if (now === undefined) {
                time.set(frameData.isProcessing || motionUtils.MotionGlobalConfig.useManualTiming
                    ? frameData.timestamp
                    : performance.now());
            }
            return now;
        },
        set: (newTime) => {
            now = newTime;
            queueMicrotask(clearTime);
        },
    };

    const isDragging = {
        x: false,
        y: false,
    };
    function isDragActive() {
        return isDragging.x || isDragging.y;
    }

    function setDragLock(axis) {
        if (axis === "x" || axis === "y") {
            if (isDragging[axis]) {
                return null;
            }
            else {
                isDragging[axis] = true;
                return () => {
                    isDragging[axis] = false;
                };
            }
        }
        else {
            if (isDragging.x || isDragging.y) {
                return null;
            }
            else {
                isDragging.x = isDragging.y = true;
                return () => {
                    isDragging.x = isDragging.y = false;
                };
            }
        }
    }

    function resolveElements(elementOrSelector, scope, selectorCache) {
        var _a;
        if (elementOrSelector instanceof EventTarget) {
            return [elementOrSelector];
        }
        else if (typeof elementOrSelector === "string") {
            let root = document;
            if (scope) {
                // TODO: Refactor to utils package
                // invariant(
                //     Boolean(scope.current),
                //     "Scope provided, but no element detected."
                // )
                root = scope.current;
            }
            const elements = (_a = selectorCache === null || selectorCache === void 0 ? void 0 : selectorCache[elementOrSelector]) !== null && _a !== void 0 ? _a : root.querySelectorAll(elementOrSelector);
            return elements ? Array.from(elements) : [];
        }
        return Array.from(elementOrSelector);
    }

    function setupGesture(elementOrSelector, options) {
        const elements = resolveElements(elementOrSelector);
        const gestureAbortController = new AbortController();
        const eventOptions = {
            passive: true,
            ...options,
            signal: gestureAbortController.signal,
        };
        const cancel = () => gestureAbortController.abort();
        return [elements, eventOptions, cancel];
    }

    function isValidHover(event) {
        return !(event.pointerType === "touch" || isDragActive());
    }
    /**
     * Create a hover gesture. hover() is different to .addEventListener("pointerenter")
     * in that it has an easier syntax, filters out polyfilled touch events, interoperates
     * with drag gestures, and automatically removes the "pointerennd" event listener when the hover ends.
     *
     * @public
     */
    function hover(elementOrSelector, onHoverStart, options = {}) {
        const [elements, eventOptions, cancel] = setupGesture(elementOrSelector, options);
        const onPointerEnter = (enterEvent) => {
            if (!isValidHover(enterEvent))
                return;
            const { target } = enterEvent;
            const onHoverEnd = onHoverStart(target, enterEvent);
            if (typeof onHoverEnd !== "function" || !target)
                return;
            const onPointerLeave = (leaveEvent) => {
                if (!isValidHover(leaveEvent))
                    return;
                onHoverEnd(leaveEvent);
                target.removeEventListener("pointerleave", onPointerLeave);
            };
            target.addEventListener("pointerleave", onPointerLeave, eventOptions);
        };
        elements.forEach((element) => {
            element.addEventListener("pointerenter", onPointerEnter, eventOptions);
        });
        return cancel;
    }

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

    /**
     * Recursively traverse up the tree to check whether the provided child node
     * is the parent or a descendant of it.
     *
     * @param parent - Element to find
     * @param child - Element to test against parent
     */
    const isNodeOrChild = (parent, child) => {
        if (!child) {
            return false;
        }
        else if (parent === child) {
            return true;
        }
        else {
            return isNodeOrChild(parent, child.parentElement);
        }
    };

    const isPrimaryPointer = (event) => {
        if (event.pointerType === "mouse") {
            return typeof event.button !== "number" || event.button <= 0;
        }
        else {
            /**
             * isPrimary is true for all mice buttons, whereas every touch point
             * is regarded as its own input. So subsequent concurrent touch points
             * will be false.
             *
             * Specifically match against false here as incomplete versions of
             * PointerEvents in very old browser might have it set as undefined.
             */
            return event.isPrimary !== false;
        }
    };

    const focusableElements = new Set([
        "BUTTON",
        "INPUT",
        "SELECT",
        "TEXTAREA",
        "A",
    ]);
    function isElementKeyboardAccessible(element) {
        return (focusableElements.has(element.tagName) ||
            element.tabIndex !== -1);
    }

    const isPressing = new WeakSet();

    /**
     * Filter out events that are not "Enter" keys.
     */
    function filterEvents(callback) {
        return (event) => {
            if (event.key !== "Enter")
                return;
            callback(event);
        };
    }
    function firePointerEvent(target, type) {
        target.dispatchEvent(new PointerEvent("pointer" + type, { isPrimary: true, bubbles: true }));
    }
    const enableKeyboardPress = (focusEvent, eventOptions) => {
        const element = focusEvent.currentTarget;
        if (!element)
            return;
        const handleKeydown = filterEvents(() => {
            if (isPressing.has(element))
                return;
            firePointerEvent(element, "down");
            const handleKeyup = filterEvents(() => {
                firePointerEvent(element, "up");
            });
            const handleBlur = () => firePointerEvent(element, "cancel");
            element.addEventListener("keyup", handleKeyup, eventOptions);
            element.addEventListener("blur", handleBlur, eventOptions);
        });
        element.addEventListener("keydown", handleKeydown, eventOptions);
        /**
         * Add an event listener that fires on blur to remove the keydown events.
         */
        element.addEventListener("blur", () => element.removeEventListener("keydown", handleKeydown), eventOptions);
    };

    /**
     * Filter out events that are not primary pointer events, or are triggering
     * while a Motion gesture is active.
     */
    function isValidPressEvent(event) {
        return isPrimaryPointer(event) && !isDragActive();
    }
    /**
     * Create a press gesture.
     *
     * Press is different to `"pointerdown"`, `"pointerup"` in that it
     * automatically filters out secondary pointer events like right
     * click and multitouch.
     *
     * It also adds accessibility support for keyboards, where
     * an element with a press gesture will receive focus and
     *  trigger on Enter `"keydown"` and `"keyup"` events.
     *
     * This is different to a browser's `"click"` event, which does
     * respond to keyboards but only for the `"click"` itself, rather
     * than the press start and end/cancel. The element also needs
     * to be focusable for this to work, whereas a press gesture will
     * make an element focusable by default.
     *
     * @public
     */
    function press(targetOrSelector, onPressStart, options = {}) {
        const [targets, eventOptions, cancelEvents] = setupGesture(targetOrSelector, options);
        const startPress = (startEvent) => {
            const target = startEvent.currentTarget;
            if (!target || !isValidPressEvent(startEvent) || isPressing.has(target))
                return;
            isPressing.add(target);
            capturePointer(startEvent, "set");
            const onPressEnd = onPressStart(target, startEvent);
            const onPointerEnd = (endEvent, success) => {
                target.removeEventListener("pointerup", onPointerUp);
                target.removeEventListener("pointercancel", onPointerCancel);
                capturePointer(endEvent, "release");
                if (!isValidPressEvent(endEvent) || !isPressing.has(target)) {
                    return;
                }
                isPressing.delete(target);
                if (typeof onPressEnd === "function") {
                    onPressEnd(endEvent, { success });
                }
            };
            const onPointerUp = (upEvent) => {
                const isOutside = !upEvent.isTrusted
                    ? false
                    : checkOutside(upEvent, target instanceof Element
                        ? target.getBoundingClientRect()
                        : {
                            left: 0,
                            top: 0,
                            right: window.innerWidth,
                            bottom: window.innerHeight,
                        });
                if (isOutside) {
                    onPointerEnd(upEvent, false);
                }
                else {
                    onPointerEnd(upEvent, !(target instanceof Element) ||
                        isNodeOrChild(target, upEvent.target));
                }
            };
            const onPointerCancel = (cancelEvent) => {
                onPointerEnd(cancelEvent, false);
            };
            target.addEventListener("pointerup", onPointerUp, eventOptions);
            target.addEventListener("pointercancel", onPointerCancel, eventOptions);
            target.addEventListener("lostpointercapture", onPointerCancel, eventOptions);
        };
        targets.forEach((target) => {
            target = options.useGlobalTarget ? window : target;
            let canAddKeyboardAccessibility = false;
            if (target instanceof HTMLElement) {
                canAddKeyboardAccessibility = true;
                if (!isElementKeyboardAccessible(target) &&
                    target.getAttribute("tabindex") === null) {
                    target.tabIndex = 0;
                }
            }
            target.addEventListener("pointerdown", startPress, eventOptions);
            if (canAddKeyboardAccessibility) {
                target.addEventListener("focus", (event) => enableKeyboardPress(event, eventOptions), eventOptions);
            }
        });
        return cancelEvents;
    }
    function checkOutside(event, rect) {
        return (event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom);
    }

    const activeAnimations = {
        layout: 0,
        mainThread: 0,
        waapi: 0,
    };

    function record() {
        const { value } = statsBuffer;
        if (value === null) {
            cancelFrame(record);
            return;
        }
        value.frameloop.rate.push(frameData.delta);
        value.animations.mainThread.push(activeAnimations.mainThread);
        value.animations.waapi.push(activeAnimations.waapi);
        value.animations.layout.push(activeAnimations.layout);
    }
    function mean(values) {
        return values.reduce((acc, value) => acc + value, 0) / values.length;
    }
    function summarise(values, calcAverage = mean) {
        if (values.length === 0) {
            return {
                min: 0,
                max: 0,
                avg: 0,
            };
        }
        return {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: calcAverage(values),
        };
    }
    const msToFps = (ms) => Math.round(1000 / ms);
    function clearStatsBuffer() {
        statsBuffer.value = null;
        statsBuffer.addProjectionMetrics = null;
    }
    function reportStats() {
        const { value } = statsBuffer;
        if (!value) {
            throw new Error("Stats are not being measured");
        }
        clearStatsBuffer();
        cancelFrame(record);
        const summary = {
            frameloop: {
                rate: summarise(value.frameloop.rate),
                read: summarise(value.frameloop.read),
                resolveKeyframes: summarise(value.frameloop.resolveKeyframes),
                update: summarise(value.frameloop.update),
                preRender: summarise(value.frameloop.preRender),
                render: summarise(value.frameloop.render),
                postRender: summarise(value.frameloop.postRender),
            },
            animations: {
                mainThread: summarise(value.animations.mainThread),
                waapi: summarise(value.animations.waapi),
                layout: summarise(value.animations.layout),
            },
            layoutProjection: {
                nodes: summarise(value.layoutProjection.nodes),
                calculatedTargetDeltas: summarise(value.layoutProjection.calculatedTargetDeltas),
                calculatedProjections: summarise(value.layoutProjection.calculatedProjections),
            },
        };
        /**
         * Convert the rate to FPS
         */
        const { rate } = summary.frameloop;
        rate.min = msToFps(rate.min);
        rate.max = msToFps(rate.max);
        rate.avg = msToFps(rate.avg);
        [rate.min, rate.max] = [rate.max, rate.min];
        return summary;
    }
    function recordStats() {
        if (statsBuffer.value) {
            clearStatsBuffer();
            throw new Error("Stats are already being measured");
        }
        const newStatsBuffer = statsBuffer;
        newStatsBuffer.value = {
            frameloop: {
                rate: [],
                read: [],
                resolveKeyframes: [],
                update: [],
                preRender: [],
                render: [],
                postRender: [],
            },
            animations: {
                mainThread: [],
                waapi: [],
                layout: [],
            },
            layoutProjection: {
                nodes: [],
                calculatedTargetDeltas: [],
                calculatedProjections: [],
            },
        };
        newStatsBuffer.addProjectionMetrics = (metrics) => {
            const { layoutProjection } = newStatsBuffer.value;
            layoutProjection.nodes.push(metrics.nodes);
            layoutProjection.calculatedTargetDeltas.push(metrics.calculatedTargetDeltas);
            layoutProjection.calculatedProjections.push(metrics.calculatedProjections);
        };
        frame.postRender(record, true);
        return reportStats;
    }

    /**
     * Maximum time between the value of two frames, beyond which we
     * assume the velocity has since been 0.
     */
    const MAX_VELOCITY_DELTA = 30;
    const isFloat = (value) => {
        return !isNaN(parseFloat(value));
    };
    const collectMotionValues = {
        current: undefined,
    };
    /**
     * `MotionValue` is used to track the state and velocity of motion values.
     *
     * @public
     */
    class MotionValue {
        /**
         * @param init - The initiating value
         * @param config - Optional configuration options
         *
         * -  `transformer`: A function to transform incoming values with.
         */
        constructor(init, options = {}) {
            /**
             * This will be replaced by the build step with the latest version number.
             * When MotionValues are provided to motion components, warn if versions are mixed.
             */
            this.version = "12.5.0";
            /**
             * Tracks whether this value can output a velocity. Currently this is only true
             * if the value is numerical, but we might be able to widen the scope here and support
             * other value types.
             *
             * @internal
             */
            this.canTrackVelocity = null;
            /**
             * An object containing a SubscriptionManager for each active event.
             */
            this.events = {};
            this.updateAndNotify = (v, render = true) => {
                const currentTime = time.now();
                /**
                 * If we're updating the value during another frame or eventloop
                 * than the previous frame, then the we set the previous frame value
                 * to current.
                 */
                if (this.updatedAt !== currentTime) {
                    this.setPrevFrameValue();
                }
                this.prev = this.current;
                this.setCurrent(v);
                // Update update subscribers
                if (this.current !== this.prev && this.events.change) {
                    this.events.change.notify(this.current);
                }
                // Update render subscribers
                if (render && this.events.renderRequest) {
                    this.events.renderRequest.notify(this.current);
                }
            };
            this.hasAnimated = false;
            this.setCurrent(init);
            this.owner = options.owner;
        }
        setCurrent(current) {
            this.current = current;
            this.updatedAt = time.now();
            if (this.canTrackVelocity === null && current !== undefined) {
                this.canTrackVelocity = isFloat(this.current);
            }
        }
        setPrevFrameValue(prevFrameValue = this.current) {
            this.prevFrameValue = prevFrameValue;
            this.prevUpdatedAt = this.updatedAt;
        }
        /**
         * Adds a function that will be notified when the `MotionValue` is updated.
         *
         * It returns a function that, when called, will cancel the subscription.
         *
         * When calling `onChange` inside a React component, it should be wrapped with the
         * `useEffect` hook. As it returns an unsubscribe function, this should be returned
         * from the `useEffect` function to ensure you don't add duplicate subscribers..
         *
         * ```jsx
         * export const MyComponent = () => {
         *   const x = useMotionValue(0)
         *   const y = useMotionValue(0)
         *   const opacity = useMotionValue(1)
         *
         *   useEffect(() => {
         *     function updateOpacity() {
         *       const maxXY = Math.max(x.get(), y.get())
         *       const newOpacity = transform(maxXY, [0, 100], [1, 0])
         *       opacity.set(newOpacity)
         *     }
         *
         *     const unsubscribeX = x.on("change", updateOpacity)
         *     const unsubscribeY = y.on("change", updateOpacity)
         *
         *     return () => {
         *       unsubscribeX()
         *       unsubscribeY()
         *     }
         *   }, [])
         *
         *   return <motion.div style={{ x }} />
         * }
         * ```
         *
         * @param subscriber - A function that receives the latest value.
         * @returns A function that, when called, will cancel this subscription.
         *
         * @deprecated
         */
        onChange(subscription) {
            {
                motionUtils.warnOnce(false, `value.onChange(callback) is deprecated. Switch to value.on("change", callback).`);
            }
            return this.on("change", subscription);
        }
        on(eventName, callback) {
            if (!this.events[eventName]) {
                this.events[eventName] = new motionUtils.SubscriptionManager();
            }
            const unsubscribe = this.events[eventName].add(callback);
            if (eventName === "change") {
                return () => {
                    unsubscribe();
                    /**
                     * If we have no more change listeners by the start
                     * of the next frame, stop active animations.
                     */
                    frame.read(() => {
                        if (!this.events.change.getSize()) {
                            this.stop();
                        }
                    });
                };
            }
            return unsubscribe;
        }
        clearListeners() {
            for (const eventManagers in this.events) {
                this.events[eventManagers].clear();
            }
        }
        /**
         * Attaches a passive effect to the `MotionValue`.
         */
        attach(passiveEffect, stopPassiveEffect) {
            this.passiveEffect = passiveEffect;
            this.stopPassiveEffect = stopPassiveEffect;
        }
        /**
         * Sets the state of the `MotionValue`.
         *
         * @remarks
         *
         * ```jsx
         * const x = useMotionValue(0)
         * x.set(10)
         * ```
         *
         * @param latest - Latest value to set.
         * @param render - Whether to notify render subscribers. Defaults to `true`
         *
         * @public
         */
        set(v, render = true) {
            if (!render || !this.passiveEffect) {
                this.updateAndNotify(v, render);
            }
            else {
                this.passiveEffect(v, this.updateAndNotify);
            }
        }
        setWithVelocity(prev, current, delta) {
            this.set(current);
            this.prev = undefined;
            this.prevFrameValue = prev;
            this.prevUpdatedAt = this.updatedAt - delta;
        }
        /**
         * Set the state of the `MotionValue`, stopping any active animations,
         * effects, and resets velocity to `0`.
         */
        jump(v, endAnimation = true) {
            this.updateAndNotify(v);
            this.prev = v;
            this.prevUpdatedAt = this.prevFrameValue = undefined;
            endAnimation && this.stop();
            if (this.stopPassiveEffect)
                this.stopPassiveEffect();
        }
        /**
         * Returns the latest state of `MotionValue`
         *
         * @returns - The latest state of `MotionValue`
         *
         * @public
         */
        get() {
            if (collectMotionValues.current) {
                collectMotionValues.current.push(this);
            }
            return this.current;
        }
        /**
         * @public
         */
        getPrevious() {
            return this.prev;
        }
        /**
         * Returns the latest velocity of `MotionValue`
         *
         * @returns - The latest velocity of `MotionValue`. Returns `0` if the state is non-numerical.
         *
         * @public
         */
        getVelocity() {
            const currentTime = time.now();
            if (!this.canTrackVelocity ||
                this.prevFrameValue === undefined ||
                currentTime - this.updatedAt > MAX_VELOCITY_DELTA) {
                return 0;
            }
            const delta = Math.min(this.updatedAt - this.prevUpdatedAt, MAX_VELOCITY_DELTA);
            // Casts because of parseFloat's poor typing
            return motionUtils.velocityPerSecond(parseFloat(this.current) -
                parseFloat(this.prevFrameValue), delta);
        }
        /**
         * Registers a new animation to control this `MotionValue`. Only one
         * animation can drive a `MotionValue` at one time.
         *
         * ```jsx
         * value.start()
         * ```
         *
         * @param animation - A function that starts the provided animation
         */
        start(startAnimation) {
            this.stop();
            return new Promise((resolve) => {
                this.hasAnimated = true;
                this.animation = startAnimation(resolve);
                if (this.events.animationStart) {
                    this.events.animationStart.notify();
                }
            }).then(() => {
                if (this.events.animationComplete) {
                    this.events.animationComplete.notify();
                }
                this.clearAnimation();
            });
        }
        /**
         * Stop the currently active animation.
         *
         * @public
         */
        stop() {
            if (this.animation) {
                this.animation.stop();
                if (this.events.animationCancel) {
                    this.events.animationCancel.notify();
                }
            }
            this.clearAnimation();
        }
        /**
         * Returns `true` if this value is currently animating.
         *
         * @public
         */
        isAnimating() {
            return !!this.animation;
        }
        clearAnimation() {
            delete this.animation;
        }
        /**
         * Destroy and clean up subscribers to this `MotionValue`.
         *
         * The `MotionValue` hooks like `useMotionValue` and `useTransform` automatically
         * handle the lifecycle of the returned `MotionValue`, so this method is only necessary if you've manually
         * created a `MotionValue` via the `motionValue` function.
         *
         * @public
         */
        destroy() {
            this.clearListeners();
            this.stop();
            if (this.stopPassiveEffect) {
                this.stopPassiveEffect();
            }
        }
    }
    function motionValue(init, options) {
        return new MotionValue(init, options);
    }

    const defaultEasing = "easeOut";
    function applyGeneratorOptions(options) {
        var _a;
        if (isGenerator(options.type)) {
            const generatorOptions = createGeneratorEasing(options, 100, options.type);
            options.ease = supportsLinearEasing()
                ? generatorOptions.ease
                : defaultEasing;
            options.duration = motionUtils.secondsToMilliseconds(generatorOptions.duration);
            options.type = "keyframes";
        }
        else {
            options.duration = motionUtils.secondsToMilliseconds((_a = options.duration) !== null && _a !== void 0 ? _a : 0.3);
            options.ease = options.ease || defaultEasing;
        }
    }
    // TODO: Reuse for NativeAnimation
    function convertMotionOptionsToNative(valueName, keyframes, options) {
        var _a;
        const nativeKeyframes = {};
        const nativeOptions = {
            fill: "both",
            easing: "linear",
            composite: "replace",
        };
        nativeOptions.delay = motionUtils.secondsToMilliseconds((_a = options.delay) !== null && _a !== void 0 ? _a : 0);
        applyGeneratorOptions(options);
        nativeOptions.duration = options.duration;
        const { ease, times } = options;
        if (times)
            nativeKeyframes.offset = times;
        nativeKeyframes[valueName] = keyframes;
        const easing = mapEasingToNativeEasing(ease, options.duration);
        /**
         * If this is an easing array, apply to keyframes, not animation as a whole
         */
        if (Array.isArray(easing)) {
            nativeKeyframes.easing = easing;
        }
        else {
            nativeOptions.easing = easing;
        }
        return {
            keyframes: nativeKeyframes,
            options: nativeOptions,
        };
    }

    class PseudoAnimation extends NativeAnimationControls {
        constructor(target, pseudoElement, valueName, keyframes, options) {
            const animationOptions = convertMotionOptionsToNative(valueName, keyframes, options);
            const animation = target.animate(animationOptions.keyframes, {
                pseudoElement,
                ...animationOptions.options,
            });
            super(animation);
        }
    }

    function chooseLayerType(valueName) {
        if (valueName === "layout")
            return "group";
        if (valueName === "enter" || valueName === "new")
            return "new";
        if (valueName === "exit" || valueName === "old")
            return "old";
        return "group";
    }

    let pendingRules = {};
    let style = null;
    const css = {
        set: (selector, values) => {
            pendingRules[selector] = values;
        },
        commit: () => {
            if (!style) {
                style = document.createElement("style");
                style.id = "motion-view";
            }
            let cssText = "";
            for (const selector in pendingRules) {
                const rule = pendingRules[selector];
                cssText += `${selector} {\n`;
                for (const [property, value] of Object.entries(rule)) {
                    cssText += `  ${property}: ${value};\n`;
                }
                cssText += "}\n";
            }
            style.textContent = cssText;
            document.head.appendChild(style);
            pendingRules = {};
        },
        remove: () => {
            if (style && style.parentElement) {
                style.parentElement.removeChild(style);
            }
        },
    };

    function getLayerName(pseudoElement) {
        const match = pseudoElement.match(/::view-transition-(old|new|group|image-pair)\((.*?)\)/);
        if (!match)
            return null;
        return { layer: match[2], type: match[1] };
    }

    function filterViewAnimations(animation) {
        var _a;
        const { effect } = animation;
        if (!effect)
            return false;
        return (effect.target === document.documentElement &&
            ((_a = effect.pseudoElement) === null || _a === void 0 ? void 0 : _a.startsWith("::view-transition")));
    }
    function getViewAnimations() {
        return document.getAnimations().filter(filterViewAnimations);
    }

    function hasTarget(target, targets) {
        return targets.has(target) && Object.keys(targets.get(target)).length > 0;
    }

    const definitionNames = ["layout", "enter", "exit", "new", "old"];
    function startViewAnimation(update, defaultOptions, targets) {
        if (!document.startViewTransition) {
            return new Promise(async (resolve) => {
                await update();
                resolve(new BaseGroupPlaybackControls([]));
            });
        }
        // TODO: Go over existing targets and ensure they all have ids
        /**
         * If we don't have any animations defined for the root target,
         * remove it from being captured.
         */
        if (!hasTarget("root", targets)) {
            css.set(":root", {
                "view-transition-name": "none",
            });
        }
        /**
         * Set the timing curve to linear for all view transition layers.
         * This gets baked into the keyframes, which can't be changed
         * without breaking the generated animation.
         *
         * This allows us to set easing via updateTiming - which can be changed.
         */
        css.set("::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*)", { "animation-timing-function": "linear !important" });
        css.commit(); // Write
        const transition = document.startViewTransition(async () => {
            await update();
            // TODO: Go over new targets and ensure they all have ids
        });
        transition.finished.finally(() => {
            css.remove(); // Write
        });
        return new Promise((resolve) => {
            transition.ready.then(() => {
                var _a;
                const generatedViewAnimations = getViewAnimations();
                const animations = [];
                /**
                 * Create animations for our definitions
                 */
                targets.forEach((definition, target) => {
                    // TODO: If target is not "root", resolve elements
                    // and iterate over each
                    for (const key of definitionNames) {
                        if (!definition[key])
                            continue;
                        const { keyframes, options } = definition[key];
                        for (let [valueName, valueKeyframes] of Object.entries(keyframes)) {
                            if (!valueKeyframes)
                                continue;
                            const valueOptions = {
                                ...getValueTransition(defaultOptions, valueName),
                                ...getValueTransition(options, valueName),
                            };
                            const type = chooseLayerType(key);
                            /**
                             * If this is an opacity animation, and keyframes are not an array,
                             * we need to convert them into an array and set an initial value.
                             */
                            if (valueName === "opacity" &&
                                !Array.isArray(valueKeyframes)) {
                                const initialValue = type === "new" ? 0 : 1;
                                valueKeyframes = [initialValue, valueKeyframes];
                            }
                            /**
                             * Resolve stagger function if provided.
                             */
                            if (typeof valueOptions.delay === "function") {
                                valueOptions.delay = valueOptions.delay(0, 1);
                            }
                            const animation = new PseudoAnimation(document.documentElement, `::view-transition-${type}(${target})`, valueName, valueKeyframes, valueOptions);
                            animations.push(animation);
                        }
                    }
                });
                /**
                 * Handle browser generated animations
                 */
                for (const animation of generatedViewAnimations) {
                    if (animation.playState === "finished")
                        continue;
                    const { effect } = animation;
                    if (!effect || !(effect instanceof KeyframeEffect))
                        continue;
                    const { pseudoElement } = effect;
                    if (!pseudoElement)
                        continue;
                    const name = getLayerName(pseudoElement);
                    if (!name)
                        continue;
                    const targetDefinition = targets.get(name.layer);
                    if (!targetDefinition) {
                        /**
                         * If transition name is group then update the timing of the animation
                         * whereas if it's old or new then we could possibly replace it using
                         * the above method.
                         */
                        const transitionName = name.type === "group" ? "layout" : "";
                        const animationTransition = {
                            ...getValueTransition(defaultOptions, transitionName),
                        };
                        applyGeneratorOptions(animationTransition);
                        const easing = mapEasingToNativeEasing(animationTransition.ease, animationTransition.duration);
                        effect.updateTiming({
                            delay: motionUtils.secondsToMilliseconds((_a = animationTransition.delay) !== null && _a !== void 0 ? _a : 0),
                            duration: animationTransition.duration,
                            easing,
                        });
                        animations.push(new NativeAnimationControls(animation));
                    }
                    else if (hasOpacity(targetDefinition, "enter") &&
                        hasOpacity(targetDefinition, "exit") &&
                        effect
                            .getKeyframes()
                            .some((keyframe) => keyframe.mixBlendMode)) {
                        animations.push(new NativeAnimationControls(animation));
                    }
                    else {
                        animation.cancel();
                    }
                }
                resolve(new BaseGroupPlaybackControls(animations));
            });
        });
    }
    function hasOpacity(target, key) {
        var _a;
        return (_a = target === null || target === void 0 ? void 0 : target[key]) === null || _a === void 0 ? void 0 : _a.keyframes.opacity;
    }

    /**
     * TODO:
     * - Create view transition on next tick
     * - Replace animations with Motion animations
     * - Return GroupAnimation on next tick
     */
    class ViewTransitionBuilder {
        constructor(update, options = {}) {
            this.currentTarget = "root";
            this.targets = new Map();
            this.notifyReady = motionUtils.noop;
            this.readyPromise = new Promise((resolve) => {
                this.notifyReady = resolve;
            });
            queueMicrotask(() => {
                startViewAnimation(update, options, this.targets).then((animation) => this.notifyReady(animation));
            });
        }
        get(selector) {
            this.currentTarget = selector;
            return this;
        }
        layout(keyframes, options) {
            this.updateTarget("layout", keyframes, options);
            return this;
        }
        new(keyframes, options) {
            this.updateTarget("new", keyframes, options);
            return this;
        }
        old(keyframes, options) {
            this.updateTarget("old", keyframes, options);
            return this;
        }
        enter(keyframes, options) {
            this.updateTarget("enter", keyframes, options);
            return this;
        }
        exit(keyframes, options) {
            this.updateTarget("exit", keyframes, options);
            return this;
        }
        crossfade(options) {
            this.updateTarget("enter", { opacity: 1 }, options);
            this.updateTarget("exit", { opacity: 0 }, options);
            return this;
        }
        updateTarget(target, keyframes, options = {}) {
            const { currentTarget, targets } = this;
            if (!targets.has(currentTarget)) {
                targets.set(currentTarget, {});
            }
            const targetData = targets.get(currentTarget);
            targetData[target] = { keyframes, options };
        }
        then(resolve, reject) {
            return this.readyPromise.then(resolve, reject);
        }
    }
    function view(update, defaultOptions = {}) {
        return new ViewTransitionBuilder(update, defaultOptions);
    }

    exports.GroupPlaybackControls = GroupPlaybackControls;
    exports.MotionValue = MotionValue;
    exports.NativeAnimationControls = NativeAnimationControls;
    exports.ViewTransitionBuilder = ViewTransitionBuilder;
    exports.activeAnimations = activeAnimations;
    exports.attachTimeline = attachTimeline;
    exports.calcGeneratorDuration = calcGeneratorDuration;
    exports.cancelFrame = cancelFrame;
    exports.cancelMicrotask = cancelMicrotask;
    exports.capturePointer = capturePointer;
    exports.collectMotionValues = collectMotionValues;
    exports.createGeneratorEasing = createGeneratorEasing;
    exports.createRenderBatcher = createRenderBatcher;
    exports.cubicBezierAsString = cubicBezierAsString;
    exports.frame = frame;
    exports.frameData = frameData;
    exports.frameSteps = frameSteps;
    exports.generateLinearEasing = generateLinearEasing;
    exports.getValueTransition = getValueTransition;
    exports.hover = hover;
    exports.isBezierDefinition = isBezierDefinition;
    exports.isDragActive = isDragActive;
    exports.isDragging = isDragging;
    exports.isGenerator = isGenerator;
    exports.isNodeOrChild = isNodeOrChild;
    exports.isPrimaryPointer = isPrimaryPointer;
    exports.isWaapiSupportedEasing = isWaapiSupportedEasing;
    exports.mapEasingToNativeEasing = mapEasingToNativeEasing;
    exports.maxGeneratorDuration = maxGeneratorDuration;
    exports.microtask = microtask;
    exports.motionValue = motionValue;
    exports.press = press;
    exports.recordStats = recordStats;
    exports.resolveElements = resolveElements;
    exports.setDragLock = setDragLock;
    exports.statsBuffer = statsBuffer;
    exports.supportedWaapiEasing = supportedWaapiEasing;
    exports.supportsFlags = supportsFlags;
    exports.supportsLinearEasing = supportsLinearEasing;
    exports.supportsScrollTimeline = supportsScrollTimeline;
    exports.time = time;
    exports.view = view;

}));
