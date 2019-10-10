/*!
 * PlainScrollbar JavaScript Library v1.0.0-rc.0
 * https://github.com/ewya/PlainScrollbar
 *
 * Copyright Kay Schewe <https://www.kayschewe.de>
 * Released under the MIT license
 * https://github.com/ewya/PlainScrollbar/blob/master/LICENSE
 */

/**
 * PlainScrollbar
 * @author Kay Schewe
 * @copyright 2019 - present
 * @param customConfiguration
 * @constructor
 */
function PlainScrollbar(customConfiguration) {

	/** Public functions */

	/**
	 * Set the enabled state.
	 * @param enabled {boolean} Will be evaluated as boolean.
	 */
	this.enabled = function(enabled) {
		scrollbarElement.setAttribute('data-enabled', enabled);
		isEnabled = Boolean(enabled);
	};

	/**
	 * Return the enabled state.
	 * @returns {boolean}
	 */
	this.isEnabled = function() {
		return isEnabled;
	};

	/**
	 * Set the scrollbar. This includes adjusting the slider and executing the onSet callback (if not prevented).
	 * @param mixed {object | string} An event or numberOfItems object or a string that is evaluated as start number.
	 * @param preventCallbackExecution {boolean} True prevents the execution of the callback (default is false).
	 * @returns {boolean}
	 */
	this.set = function(mixed, preventCallbackExecution) {

		if (isInternalEventSource) {
			// Ignore external calls if currently an internal event source is processed.
			return false;
		}

		if (!isEnabled) {
			// Prevent callback execution but adjust the scrollbar.
			preventCallbackExecution = true;
		}

		// Determine if data can be calculated by object (event | numberOfItems) or can be evaluated as string (start).
		var data = null;

		switch(typeof mixed) {
			case 'object':
				// Test if mixed can be evaluated as an event object.
				data = calculateDataFromEvent(mixed);
				if ('event' === data.source) {
					return setSlider(data, preventCallbackExecution);
				}

				// Test if mixed can be evaluated as a numberOfItems object.
				if (mixed.hasOwnProperty('start') && !isNaN(mixed.start)
					&& mixed.hasOwnProperty('total') && !isNaN(mixed.total)
					&& mixed.hasOwnProperty('visible') && !isNaN(mixed.visible)) {

					configuration.numberOfItems = extend(configuration.numberOfItems, {
						start: mixed.start,
						total: mixed.total,
						visible: mixed.visible,
					});
					data = calculateDataFromStart(configuration.numberOfItems.start);
					return setSlider(data, preventCallbackExecution);
				}
				break;

			case 'string':
				// Test if mixed can be evaluated as a start value.
				data = calculateDataFromStart(mixed);
				if ('start' === data.source) {
					return setSlider(data, preventCallbackExecution);
				}
				break;
		}

		return false;
	};
	
	/** Private functions */

	/**
	 * Simple object extend function.
	 * @param obj
	 * @param src
	 * @returns {*}
	 */
	function extend(obj, src) {
		Object.keys(src).forEach(function(key) {
			obj[key] = src[key];
		});
		return obj;
	}

	/**
	 * Set the slider and execute the onSet callback.
	 * @param data {{source: string, type: string, value: number}}
	 * @param preventCallbackExecution {boolean} True prevents the execution of the callback (default is false).
	 */
	function setSlider(data, preventCallbackExecution) {

		// Test if data can be evaluated to set the slider.

		if (!data.hasOwnProperty('source')
			|| !data.hasOwnProperty('type')
			|| !data.hasOwnProperty('value')) {
			// TODO: types ;-)
			return false
		}

		// Proceed setting slider value...

		var dataValue = (isNaN(data.value)) ? 0 : parseFloat(data.value),
			executeCallback = (preventCallbackExecution !== true);

		// Calculate newValue for slider and newStart for numberOfItems.

		var sliderAreaBoundingClientRect = sliderAreaElement.getBoundingClientRect(),
			sliderAreaSize = sliderAreaBoundingClientRect[maxAttribute],
			sliderBoundingClientRect = sliderElement.getBoundingClientRect(),
			itemSize = sliderAreaSize / configuration.numberOfItems.total,
			sliderSize = Math.max(configuration.sliderMinSize, configuration.numberOfItems.visible * itemSize),
			isScrollable = (configuration.numberOfItems.total > configuration.numberOfItems.visible);

		var currentValue = parseFloat(sliderElement.style[valueAttribute]),
			maxValue = sliderAreaSize - sliderSize,
			minValue = 0,
			newValue = currentValue;

		switch(data.type) {
			case 'delta':
				newValue = currentValue + dataValue;
				break;

			case 'x':
			case 'y':
				newValue = dataValue - ((isSliderDrag && sliderOffset) ? sliderOffset : 0);
				break;
		}

		if (newValue < minValue) {
			newValue = minValue;
		}
		if (newValue > maxValue) {
			newValue = maxValue;
		}

		// Adjust sliderElement valueAttribute (left or top).
		if (currentValue !== newValue) {
			sliderElement.style[valueAttribute] = newValue + 'px';
		}

		// Adjust sliderElement maxAttribute (height or width).
		if (sliderBoundingClientRect[maxAttribute] !== sliderSize) {
			sliderElement.style[maxAttribute] = sliderSize + 'px';
		}

		// Adjust scrollbarElement data-scrollable attribute.
		scrollbarElement.setAttribute('data-scrollable', isScrollable);

		// Formula: start / value = (total - visible) / (sliderAreaSize - sliderSize)

		configuration.numberOfItems.start =
			(configuration.numberOfItems.total - configuration.numberOfItems.visible) / maxValue * newValue;

		if (executeCallback) {
			// Execute the onSet callback and provide numberOfItems.
			if ('function' === typeof configuration.onSet) {
				this.onSet = configuration.onSet;
				// The callback scope of 'this' is the PlainScrollbar instance.
				this.onSet({
					start: configuration.numberOfItems.start,
					total: configuration.numberOfItems.total,
					visible: configuration.numberOfItems.visible,
				});
			} else {
				// Nothing to do.
			}
		}

		return true;
	}

	/**
	 * Calculate a data object by an event that can be used for calling setSlider.
	 * @param start
	 * @returns {{source: string, type: string, value: number}}
	 */
	function calculateDataFromStart(start) {

		start = parseFloat(start);

		var maxStart = configuration.numberOfItems.total - configuration.numberOfItems.visible,
			minStart = 0;

		if (start < minStart) {
			// TODO ?: Warn about inconsistency.
			start = minStart;
		}
		if (start > maxStart) {
			// TODO ?: Warn about inconsistency.
			start = maxStart;
		}

		var data = {
			source: 'start',
			type: '',
			value: 0,
		};

		var sliderAreaBoundingClientRect = sliderAreaElement.getBoundingClientRect(),
			sliderAreaSize = sliderAreaBoundingClientRect[maxAttribute],
			itemSize = sliderAreaSize / configuration.numberOfItems.total,
			sliderSize = Math.max(configuration.sliderMinSize, configuration.numberOfItems.visible * itemSize),
			maxValue = sliderAreaSize - sliderSize;

		// Formula: start / value = (total - visible) / (sliderAreaSize - sliderSize)

		data.value = maxValue / (configuration.numberOfItems.total - configuration.numberOfItems.visible) * start;

		if ('horizontal' === configuration.orientation) {
			data.type = 'x';
		}
		if ('vertical' === configuration.orientation) {
			data.type = 'y';
		}

		return data;
	}

	/**
	 * Calculate a data object by a (number of items) start value that can be used for calling setSlider.
	 * @param event
	 * @returns {{source: string, type: string, value: number}}
	 */
	function calculateDataFromEvent(event) {
		var data = {
			source: 'event',
			type: '',
			value: 0,
		};

		switch(event.type) {
			case 'mousedown':
			case 'mousemove':
			case 'mouseup':
				var sliderAreaBoundingClientRect = sliderAreaElement.getBoundingClientRect(),
					sliderAreaOffset = sliderAreaBoundingClientRect[valueAttribute];

				if ('horizontal' === configuration.orientation) {
					data.type = 'x';
					data.value = event.pageX - sliderAreaOffset;
				}
				if ('vertical' === configuration.orientation) {
					data.type = 'y';
					data.value = event.pageY - sliderAreaOffset;
				}
				break;

			case 'wheel':
				data.type = 'delta';

				if ('horizontal' === configuration.orientation) {
					data.value = (0 < event.deltaX) ? 1 : -1;
				}
				if ('vertical' === configuration.orientation) {
					data.value = (0 < event.deltaY) ? 1 : -1;
				}

				data.value *= configuration.wheelSpeed;
				break;

			default:
				data.source = '';
				break;
		}

		return data;
	}

	/** scrollbarElement event listener */

	/**
	 * Handle scrollbar mouseenter event if scrollbar is enabled.
	 * @param event
	 */
	function scrollbarMouseEnter(event) {
		if (!isEnabled) {
			return;
		}

		event.preventDefault();
		scrollbarElement.setAttribute('data-visible', true);
	}

	/**
	 * Handle scrollbar mouseleave event if scrollbar is enabled.
	 * @param event
	 */
	function scrollbarMouseLeave(event) {
		if (!isEnabled) {
			return;
		}

		event.preventDefault();
		if (!isSliderDrag && !configuration.alwaysVisible) {
			scrollbarElement.setAttribute('data-visible', false);
		}
	}

	/** sliderAreaElement event listener */

	/**
	 * Handle slider area mousedown event if scrollbar is enabled and it's not a slider drag operation.
	 * @param event
	 */
	function sliderAreaMouseDown(event) {
		if (!isEnabled || isSliderDrag) {
			return;
		}

		event.preventDefault();
		if (configuration.movePageByPageOnAreaClick) {
			var start = configuration.numberOfItems.start,
				visible = configuration.numberOfItems.visible,
				currentValue = parseFloat(sliderElement.style[valueAttribute]),
				value = currentValue;

			switch(configuration.orientation) {
				case 'horizontal':
					value = event.offsetX;
					break;

				case 'vertical':
					value = event.offsetY;
					break;
			}

			if (value < currentValue) {
				start -= visible;
			}
			if (value > currentValue) {
				start += visible;
			}

			setSlider(calculateDataFromStart(start));
		} else {
			setSlider(calculateDataFromEvent(event));
		}
	}

	/**
	 * Handle slider area mouseup event if it's a slider drag operation.
	 * @param event
	 */
	function sliderAreaMouseUp(event) {
		if (!isSliderDrag) {
			return;
		}

		event.preventDefault();
		if (isEnabled) {
			setSlider(calculateDataFromEvent(event));
		}
		isInternalEventSource = isSliderDrag = false;
	}

	/**
	 * Handle slider area wheel event if scrollbar is enabled and if it's not a slider drag operation.
	 * @param event
	 */
	function sliderAreaWheel(event) {
		if (!isEnabled || isSliderDrag) {
			return;
		}

		event.preventDefault();
		clearTimeout(eventTimeout);
		isInternalEventSource = true;
		setSlider(calculateDataFromEvent(event));
		isInternalEventSource = false; //< TODO ?: Use timeout.
	}

	/** sliderElement event listener */

	/**
	 * Handle slider mousedown event if scrollbar is enabled.
	 * @param event
	 */
	function sliderMouseDown(event) {
		if (!isEnabled) {
			return;
		}

		event.preventDefault();
		clearTimeout(eventTimeout);
		isInternalEventSource = isSliderDrag = true;
		sliderOffset = 0;
		if ('horizontal' === configuration.orientation) {
			sliderOffset = event.offsetX;
		}
		if ('vertical' === configuration.orientation) {
			sliderOffset = event.offsetY;
		}
	}

	/** window event listener */

	/**
	 * Handle window mousemove event if scrollbar is enabled and it's a slider drag operation.
	 * @param event
	 */
	function windowMouseMove(event) {
		if (!isEnabled || !isSliderDrag) {
			return;
		}

		event.preventDefault();
		clearTimeout(eventTimeout);
		eventTimeout = setTimeout(function() {
			setSlider(calculateDataFromEvent(event));
		}, 1);
	}

	/**
	 * Handle window mouseup event if it's a slider drag operation.
	 * @param event
	 */
	function windowMouseUp(event) {
		if (!isSliderDrag) {
			return;
		}

		event.preventDefault();
		clearTimeout(eventTimeout);
		if (!configuration.alwaysVisible) {
			scrollbarElement.setAttribute('data-visible', false);
		}
		if (isEnabled) {
			setSlider(calculateDataFromEvent(event));
		}
		isInternalEventSource = isSliderDrag = false;
	}

	/** arrowElement event listener */

	/**
	 * Handle arrow (backward) click event if scrollbar is enabled.
	 * @param event
	 */
	function arrowClickBackward(event) {
		if (!isEnabled) {
			return;
		}

		event.preventDefault();
		var start = configuration.numberOfItems.start -1;
		setSlider(calculateDataFromStart(start));
	}

	/**
	 * Handle arrow (forward) click event if scrollbar is enabled.
	 * @param event
	 */
	function arrowClickForward(event) {
		if (!isEnabled) {
			return;
		}

		event.preventDefault();
		var start = configuration.numberOfItems.start +1;
		setSlider(calculateDataFromStart(start));
	}

	/**
	 * Init the scrollbar.
	 */

	var defaultConfiguration = {
			/**
			 * Configure that the scrollbar is always visible.
			 * @property alwaysVisible {boolean}
			 */
			alwaysVisible: false,

			/**
			 * Configure that the scrollbar has arrows on each end.
			 * An arrow click will move the slider by one item backward or forward.
			 * @property arrows {boolean}
			 */
			arrows: false,

			/**
			 * Configure that a click on the slider area will move the slider by the numberOfItems.visible backward
			 * or forward.
			 * @property movePageByPageOnAreaClick {boolean}
			 */
			movePageByPageOnAreaClick: true,

			/**
			 * Configure the number of items that should be considered.
			 * @property changeNumberOfItems {{start: string|number, total: string|number, visible: string|number}}
			 */
			numberOfItems: {
				start: 0,
				total: 0,
				visible: 0
			},

			/**
			 * Configure the callback, that should to be called if the scrollbar will change the slider and therefore
			 * the numberOfItems.start. The current numberOfItems object is the sole callback function parameter.
			 * @property onSet {function(numberOfItems){// Do something...}}
			 */
			onSet: null,

			/**
			 * Configure the scrollbar element, that must be a html5 container element (e.g. <div/>).
			 * @property scrollbarElement {HTMLElement}
			 */
			scrollbarElement: null,

			/**
			 * Configure the minimal size of the slider by px.
			 * @property sliderMinSize {number}
			 */
			sliderMinSize: 20,

			/**
			 * Configure the wheel speed factor.
			 * @property wheelSpeed {number}
			 */
			wheelSpeed: 2,
		},
		// Private properties...
		eventTimeout = null,
		isEnabled = true,
		isInternalEventSource = false,
		isSliderDrag = false,
		sliderOffset = 0;
	
	// Validate configuration

	if (!customConfiguration) {
		throw 'Missing customConfiguration!';
	}
	if (!customConfiguration.hasOwnProperty('scrollbarElement')
	|| customConfiguration.scrollbarElement.hasOwnProperty('nodeName') ) {
		throw 'Missing valid configuration.scrollbarElement!';
	}
	if (!customConfiguration.hasOwnProperty('orientation')
	|| ['horizontal', 'vertical'].indexOf(customConfiguration.orientation) === -1) {
		throw 'Missing valid configuration.orientation!';
	}

	// Proceed to create the scrollbar...

	var configuration = extend(defaultConfiguration, customConfiguration),
		scrollbarElement = configuration.scrollbarElement,
		scrollbarElementDocument = scrollbarElement.ownerDocument;

	var cssClasses = [
			'plain-scrollbar',
			'scrollbar-' + configuration.orientation,
		],
		maxAttribute = null,
		valueAttribute = null;
	
	if ('horizontal' === configuration.orientation) {
		maxAttribute = 'width';
		valueAttribute = 'left';
	}
	if ('vertical' === configuration.orientation) {
		maxAttribute = 'height';
		valueAttribute = 'top';
	}

	scrollbarElement.setAttribute('data-enabled', true);
	scrollbarElement.setAttribute('data-scrollable', true);
	scrollbarElement.setAttribute('data-visible', (configuration.alwaysVisible === true));
	for (var i = 0; i < cssClasses.length; i++) {
		scrollbarElement.classList.add(cssClasses[i]);
	}

	// determine arrowElements and create them if configured.
	var arrowElements = {};
	if (configuration.arrows) {
		scrollbarElement.classList.add('has-arrows');
		arrowElements = {
			'backward': scrollbarElementDocument.createElement('div'),
			'forward': scrollbarElementDocument.createElement('div'),
		};
	}

	for(var m in arrowElements) {
		if (!arrowElements.hasOwnProperty(m)) {
			continue;
		}

		var cssClass = 'arrow-',
			listener = function(){};

		switch(m) {
			case 'backward':
				if ('horizontal' === configuration.orientation) {
					cssClass += 'left';
				}
				if ('vertical' === configuration.orientation) {
					cssClass += 'up';
				}
				listener = arrowClickBackward;
				break;

			case 'forward':
				if ('horizontal' === configuration.orientation) {
					cssClass += 'right';
				}
				if ('vertical' === configuration.orientation) {
					cssClass += 'down';
				}
				listener = arrowClickForward;
				break;

			default:
				cssClass += 'undefined';
				break;
		}

		arrowElements[m].classList.add(cssClass);
		arrowElements[m].appendChild(scrollbarElementDocument.createElement('span'));
		arrowElements[m].addEventListener('mousedown', listener, false);
		scrollbarElement.appendChild(arrowElements[m]);
	}

	var sliderElement = scrollbarElementDocument.createElement('div');
	sliderElement.classList.add('slider');
	sliderElement.style[valueAttribute] = '0';
	sliderElement.style[maxAttribute] = '0';
	sliderElement.addEventListener('mousedown', sliderMouseDown, false);

	var sliderAreaElement = scrollbarElementDocument.createElement('div');
	sliderAreaElement.classList.add('slider-area');
	sliderAreaElement.appendChild(sliderElement);
	sliderAreaElement.addEventListener('mousedown', sliderAreaMouseDown, false);
	sliderAreaElement.addEventListener('mouseup', sliderAreaMouseUp, false);
	sliderAreaElement.addEventListener('wheel', sliderAreaWheel, false);
	
	scrollbarElement.appendChild(sliderAreaElement);
	scrollbarElement.addEventListener('mouseenter', scrollbarMouseEnter, false);
	scrollbarElement.addEventListener('mouseleave', scrollbarMouseLeave, false);

	var scrollbarElementWindow = scrollbarElementDocument.defaultView;
	scrollbarElementWindow.addEventListener('mousemove', windowMouseMove, false);
	scrollbarElementWindow.addEventListener('mouseup', windowMouseUp, false);

	setSlider(calculateDataFromStart(configuration.numberOfItems.start));
}
