import * as support from './_support';
import * as options from './_defaults';
import * as settings from './_settings';
import { percentage2number } from './_helpers';
import { extend } from '../helpers';

export default class DragEvents {
    /** The draggable area. */
    surface: HTMLElement;

    /** How far from the sides the gesture can start. */
    area: dragArea;

    /** Tresholds for gestures. */
    treshold: dragTreshold;

    /** Where the gesture started. */
    startPosition: dragCoordinates;

    /** The last measured x- and y- position. */
    currentPosition: dragCoordinates;

    /** The dragged x- and y-distances since the start. */
    distance: dragCoordinates;

    /** The dragged x- and y-distances since the last event. */
    movement: dragCoordinates;

    /** The axis of the gesture. */
    axis: 'x' | 'y';

    /** The state of the gesture. */
    state: number;

    /**
     * Create the gestures.
     * @param {HTMLElement} surface     The surface for the gesture.
     * @param {object}      area        Restriction where on the surface the gesture can be started.
     * @param {object}      treshold    Treshold for the gestures.
     */
    constructor(
        surface: HTMLElement,
        area?: dragArea,
        treshold?: dragTreshold
    ) {
        this.surface = surface;
        this.area = extend(area, options.area);
        this.treshold = extend(treshold, options.treshold);

        //	Set the mouse/touch events.
        if (!this.surface['mmHasDragEvents']) {
            this.surface.addEventListener(
                support.touch ? 'touchstart' : 'mousedown',
                this.start.bind(this)
            );
            this.surface.addEventListener(
                support.touch ? 'touchend' : 'mouseup',
                this.stop.bind(this)
            );
            this.surface.addEventListener(
                support.touch ? 'touchleave' : 'mouseleave',
                this.stop.bind(this)
            );
            this.surface.addEventListener(
                support.touch ? 'touchmove' : 'mousemove',
                this.move.bind(this)
            );
        }

        this.surface['mmHasDragEvents'] = true;
    }

    /**
     * Starting the touch gesture.
     * @param {Event} event The touch event.
     */
    start(event) {
        this.currentPosition = {
            x: event.touches ? event.touches[0].pageX : event.pageX || 0,
            y: event.touches ? event.touches[0].pageY : event.pageY || 0
        };

        /** The widht of the surface. */
        var width = this.surface.clientWidth;

        /** The height of the surface. */
        var height = this.surface.clientHeight;

        //  Check if the gesture started below the area.top.
        var top = percentage2number(this.area.top, height);
        if (typeof top == 'number') {
            if (this.currentPosition.y < top) {
                return;
            }
        }

        //  Check if the gesture started before the area.right.
        var right = percentage2number(this.area.right, width);
        if (typeof right == 'number') {
            right = width - right;
            if (this.currentPosition.x > right) {
                return;
            }
        }

        //  Check if the gesture started above the area.bottom.
        var bottom = percentage2number(this.area.bottom, height);
        if (typeof bottom == 'number') {
            bottom = height - bottom;
            if (this.currentPosition.y > bottom) {
                return;
            }
        }

        //  Check if the gesture started after the area.left.
        var left = percentage2number(this.area.left, width);
        if (typeof left == 'number') {
            if (this.currentPosition.x < left) {
                return;
            }
        }

        //	Store the start x- and y-position.
        this.startPosition = {
            x: this.currentPosition.x,
            y: this.currentPosition.y
        };

        //	Set the state of the gesture to "watching".
        this.state = settings.state.watching;
    }

    /**
     * Stopping the touch gesture.
     * @param {Event} event The touch event.
     */
    stop(event) {
        //	Dispatch the "dragEnd" events.
        if (this.state == settings.state.dragging) {
            /** The direction. */
            const dragDirection = this._dragDirection();

            /** The event information. */
            const detail = this._eventDetail(dragDirection);

            this._dispatchEvents('drag*End', detail);

            //	Dispatch the "swipe" events.
            if (Math.abs(this.movement[this.axis]) > this.treshold.swipe) {
                /** The direction. */
                const swipeDirection = this._swipeDirection();
                detail.direction = swipeDirection;

                this._dispatchEvents('swipe*', detail);
            }
        }

        //	Set the state of the gesture to "inactive".
        this.state = settings.state.inactive;
    }

    /**
     * Doing the touch gesture.
     * @param {Event} event The touch event.
     */
    move(event) {
        switch (this.state) {
            case settings.state.watching:
            case settings.state.dragging:
                var position = {
                    x: event.changedTouches
                        ? event.touches[0].pageX
                        : event.pageX || 0,
                    y: event.changedTouches
                        ? event.touches[0].pageY
                        : event.pageY || 0
                };

                this.movement = {
                    x: position.x - this.currentPosition.x,
                    y: position.y - this.currentPosition.y
                };

                this.distance = {
                    x: position.x - this.startPosition.x,
                    y: position.y - this.startPosition.y
                };

                this.currentPosition = {
                    x: position.x,
                    y: position.y
                };

                this.axis =
                    Math.abs(this.distance.x) > Math.abs(this.distance.y)
                        ? 'x'
                        : 'y';

                /** The direction. */
                const dragDirection = this._dragDirection();

                /** The event information. */
                const detail = this._eventDetail(dragDirection);

                //	Watching for the gesture to go past the treshold.
                if (this.state == settings.state.watching) {
                    if (
                        Math.abs(this.distance[this.axis]) > this.treshold.start
                    ) {
                        this._dispatchEvents('drag*Start', detail);

                        //	Set the state of the gesture to "inactive".
                        this.state = settings.state.dragging;
                    }
                }

                //	Dispatch the "drag" events.
                if (this.state == settings.state.dragging) {
                    this._dispatchEvents('drag*Move', detail);
                }
                break;
        }
    }

    /**
     * Get the event details.
     * @param {string}  direction   Direction for the event (up, right, down, left).
     * @return {object}             The event details.
     */
    _eventDetail(direction: string) {
        var distX = this.distance.x;
        var distY = this.distance.y;

        if (this.axis == 'x') {
            distX -= distX > 0 ? this.treshold.start : 0 - this.treshold.start;
        }

        if (this.axis == 'y') {
            distY -= distY > 0 ? this.treshold.start : 0 - this.treshold.start;
        }

        return {
            axis: this.axis,
            direction: direction,
            movementX: this.movement.x,
            movementY: this.movement.y,
            distanceX: distX,
            distanceY: distY
        };
    }

    /**
     * Dispatch the events
     * @param {string} eventName    The name for the events to dispatch.
     * @param {object} detail       The event details.
     */
    _dispatchEvents(eventName: string, detail) {
        /** General event, e.g. "drag" */
        var event = new CustomEvent(eventName.replace('*', ''), { detail });
        this.surface.dispatchEvent(event);

        /** Axis event, e.g. "dragX" */
        var axis = new CustomEvent(
            eventName.replace('*', this.axis.toUpperCase()),
            { detail }
        );
        this.surface.dispatchEvent(axis);

        /** Direction event, e.g. "dragLeft" */
        var direction = new CustomEvent(
            eventName.replace('*', detail.direction),
            {
                detail
            }
        );
        this.surface.dispatchEvent(direction);
    }

    /**
     * Get the dragging direction.
     * @return {string} The direction in which the user is dragging.
     */
    _dragDirection() {
        return settings.directionNames[this.axis][
            this.distance[this.axis] > 0 ? 0 : 1
        ];
    }

    /**
     * Get the dragging direction.
     * @return {string} The direction in which the user is dragging.
     */
    _swipeDirection() {
        return settings.directionNames[this.axis][
            this.movement[this.axis] > 0 ? 0 : 1
        ];
    }
}
