/**
 * Construct a PlainScrollbar instance.
 * @param options
 * @constructor
 */
function PlainScrollbar(options) {

	/** Public functions */

	/**
	 * Calculates a data object by an event the can be used for calling setSlider.
	 * @param start
	 * @returns {{source: string, type: string, value: number}}
	 */
	this.calculateDataFromStart = function(start) {

		start = parseFloat(start);

		var maxStart = config.numberOfItems.total - config.numberOfItems.visible,
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
			value: 0,
			type: '',
			source: 'start',
		};

		var sliderAreaBoundingClientRect = sliderAreaElement.getBoundingClientRect(),
			sliderAreaSize = sliderAreaBoundingClientRect[maxAttribute],
			itemSize = sliderAreaSize / config.numberOfItems.total,
			sliderSize = Math.max(config.sliderMinSize, config.numberOfItems.visible * itemSize);

		/**
		 *	start / value = (total - visible) / (sliderAreaSize - sliderSize)
		 */

		var maxValue = sliderAreaSize - sliderSize;

		data.value = maxValue / (config.numberOfItems.total - config.numberOfItems.visible) * start;

		if ('horizontal' === config.orientation) {
			data.type = 'x';
		}
		if ('vertical' === config.orientation) {
			data.type = 'y';
		}

		return data;
	};

	/**
	 * Calculates a data object by a (number of items) start value the can be used for calling setSlider.
	 * @param event
	 * @returns {{source: string, type: string, value: number}}
	 */
	this.extractDataFromEvent = function(event) {
		var data = {
			value: 0,
			type: '',
			source: 'event',
		};

		switch(event.type) {
			case 'mousedown':
			case 'mousemove':
			case 'mouseup':
				var sliderAreaBoundingClientRect = sliderAreaElement.getBoundingClientRect(),
					sliderAreaOffset = sliderAreaBoundingClientRect[valueAttribute];

				if ('horizontal' === config.orientation) {
					data.type = 'x';
					data.value = event.pageX - sliderAreaOffset;
				}
				if ('vertical' === config.orientation) {
					data.type = 'y';
					data.value = event.pageY - sliderAreaOffset;
				}

			break;

			case 'wheel':
				data.type = 'delta';

				if ('horizontal' === config.orientation) {
					data.value = (0 < event.deltaX) ? 1 : -1;
				}
				if ('vertical' === config.orientation) {
					data.value = (0 < event.deltaY) ? 1 : -1;
				}

				data.value *= config.wheelSpeed;

			break;
		}

		return data;
	};

	/**
	 * Set the number of items, then call setSlider.
	 * @param numberOfItems
	 * @param preventCallbackExecution
	 */
	this.setNumberOfItems = function(numberOfItems, preventCallbackExecution) {
		// TODO: Validate total, visible, start
		config.numberOfItems = extend(config.numberOfItems, numberOfItems);
		this.setSlider(this.calculateDataFromStart(config.numberOfItems.start), preventCallbackExecution);
	};

	/**
	 * Set the slider.
	 * @param data
	 * @param preventCallbackExecution
	 */
	this.setSlider = function(data, preventCallbackExecution) {
		// log('setSlider', data, executeCallback);
		var dataValue = (isNaN(data.value)) ? 0 : parseFloat(data.value),
			executeCallback = (preventCallbackExecution !== true);

		// log('setSlider', data, executeCallback);

		/** calculate newValue and newStart */

		var sliderAreaBoundingClientRect = sliderAreaElement.getBoundingClientRect(),
			sliderAreaSize = sliderAreaBoundingClientRect[maxAttribute],
			sliderBoundingClientRect = sliderElement.getBoundingClientRect(),
			itemSize = sliderAreaSize / config.numberOfItems.total,
			sliderSize = Math.max(config.sliderMinSize, config.numberOfItems.visible * itemSize);

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

		/**
		 *	start / value = (total - visible) / (sliderAreaSize - sliderSize)
		 */

		var newStart = (config.numberOfItems.total - config.numberOfItems.visible) / maxValue * newValue;

		config.numberOfItems.start = newStart;

		// adjust sliderElement valueAttribute (left or top)
		if (currentValue !== newValue) {
			sliderElement.style[valueAttribute] = newValue + 'px';
		}

		// adjust sliderElement maxAttribute (height or width)
		if (sliderBoundingClientRect[maxAttribute] !== sliderSize) {
			sliderElement.style[maxAttribute] = sliderSize + 'px';
		}

		// log('setSlider:calculated', {
		// 	numberOfItems: config.numberOfItems,
		// 	itemSize: itemSize,
		// 	sliderSize: sliderSize,
		// 	newStart: newStart,
		// });

		if (executeCallback) {
			// execute onUpdate callback and provide newStart
			if ('function' === typeof config.onUpdate) {
				// scope of 'this' is set to the PlainScrollbar instance
				this.onUpdate = config.onUpdate;
				this.onUpdate(newStart);
			}
		}
	};

	/** Private functions */

	/**
	 * Simple console logging.
	 */
	function log() {
		console.log.apply(null, arguments);
	}

	/**
	 * Simple object extend function that is used to merge the PlainScrollbar custom options with the default options.
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

	/** scrollbarElement event listener */

	/**
	 * Handle scrollbar mouseenter event.
	 * @param event
	 */
	function scrollbarMouseEnter(event) {
		event.preventDefault();
		config.scrollbarElement.setAttribute('data-visible', true);
	}

	/**
	 * Handle scrollbar mouseleave event.
	 * @param event
	 */
	function scrollbarMouseLeave(event) {
		event.preventDefault();
		if (!isSliderDrag && !config.alwaysVisible) {
			config.scrollbarElement.setAttribute('data-visible', false);
		}
	}

	/** sliderAreaElement event listener */

	/**
	 * Handle slider area mousedown event if it's not a slider drag operation.
	 * @param event
	 */
	function sliderAreaMouseDown(event) {
		if (isSliderDrag) {
			return;
		}

		event.preventDefault();
		if (config.movePageByPageOnAreaClick) {
			var start = config.numberOfItems.start,
				visible = config.numberOfItems.visible,
				currentValue = parseFloat(sliderElement.style[valueAttribute]),
				value = currentValue;

			switch(config.orientation) {
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

			self.setSlider(self.calculateDataFromStart(start));
		} else {
			self.setSlider(self.extractDataFromEvent(event));
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
		self.setSlider(self.extractDataFromEvent(event));
		isSliderDrag = false;
	}

	/**
	 * Handle slider area wheel event if it's not a slider drag operation.
	 * @param event
	 */
	function sliderAreaWheel(event) {
		if (isSliderDrag) {
			return;
		}

		event.preventDefault();
		self.setSlider(self.extractDataFromEvent(event));
	}

	/** arrowElement event listener */

	/**
	 * Handle arrow (backward) click event.
	 * @param event
	 */
	function arrowClickBackward(event) {
		event.preventDefault();
		var start = config.numberOfItems.start -1;
		self.setSlider(self.calculateDataFromStart(start));
	}

	/**
	 * Handle arrow (forward) click event.
	 * @param event
	 */
	function arrowClickForward(event) {
		event.preventDefault();
		var start = config.numberOfItems.start +1;
		self.setSlider(self.calculateDataFromStart(start));
	}

	/** sliderElement event listener */

	/**
	 * Handle slider mousedown event.
	 * @param event
	 */
	function sliderMouseDown(event) {
		event.preventDefault();
		clearTimeout(eventTimeout);
		isSliderDrag = true;
		sliderOffset = 0;
		if ('horizontal' === config.orientation) {
			sliderOffset = event.offsetX;
		}
		if ('vertical' === config.orientation) {
			sliderOffset = event.offsetY;
		}
	}

	/** window event listener */

	/**
	 * Handle window mousemove event if it's a slider drag operation.
	 * @param event
	 */
	function windowMouseMove(event) {
		if (!isSliderDrag) {
			return;
		}

		event.preventDefault();
		clearTimeout(eventTimeout);
		eventTimeout = setTimeout(function() {
			self.setSlider(self.extractDataFromEvent(event));
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
		if (!config.alwaysVisible) {
			config.scrollbarElement.setAttribute('data-visible', false);
		}
		self.setSlider(self.extractDataFromEvent(event));
		isSliderDrag = false;
	}

	/**
	 * Init
	 */

	log('PlainScrollbar:constructor:arguments', arguments);

	var defaultOptions = {
			/**
			 * Configure that the scrollbar is always visible.
			 * An arrow click will move the slider by one item backward or forward.
			 */
			alwaysVisible: false,
			/**
			 * Configure that the scrollbar has arrows on each end.
			 * An arrow click will move the slider by one item backward or forward.
			 */
			arrows: false,
			/**
			 * Configure that a click on the slider area will move the slider by the numberOfItems.visible backward or forward.
			 */
			movePageByPageOnAreaClick: true,
			/**
			 * Configure the number of items the should be considered.
			 */
			numberOfItems: {
				start: 0,
				total: 0,
				visible: 0
			},
			/**
			 * Configure the minimal size of the slider by px.
			 */
			sliderMinSize: 20,
			/**
			 * Configure the wheel speed factor.
			 */
			wheelSpeed: 2,
		},
		eventTimeout = null,
		isSliderDrag = false,
		sliderOffset = 0,
		self = this;
	
	// options etc
	
	// TODO: validate required options!
	if (!options) {
		throw 'Missing options!';
	}
	if (!options.hasOwnProperty('scrollbarElement') 
	|| options.scrollbarElement.hasOwnProperty('nodeName') ) {
		throw 'Missing valid option.scrollbarElement!';
	}
	if (!options.hasOwnProperty('orientation') 
	|| ['horizontal', 'vertical'].indexOf(options.orientation) === -1) {
		throw 'Missing valid option.orientation!';
	}

	var config = extend(defaultOptions, options);
	log('PlainScrollbar:init:options', config);

	var cssClasses = [
			'plain-scrollbar',
			'scrollbar-' + config.orientation,
		],
		maxAttribute = null,
		valueAttribute = null;
	
	if ('horizontal' === config.orientation) {
		maxAttribute = 'width';
		valueAttribute = 'left';
	}
	if ('vertical' === config.orientation) {
		maxAttribute = 'height';
		valueAttribute = 'top';
	}

	// determine scrollbarElement
	config.scrollbarElement.setAttribute('data-visible', (config.alwaysVisible === true));
	for (var i = 0; i < cssClasses.length; i++) {
		config.scrollbarElement.classList.add(cssClasses[i]);
	}

	// determine arrowElements and create them if configured.
	var arrowElements = {};
	if (config.arrows) {
		config.scrollbarElement.classList.add('has-arrows');
		// create arrow elements
		arrowElements = {
			'backward': document.createElement('div'),
			'forward': document.createElement('div'),
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
				if ('horizontal' === config.orientation) {
					cssClass += 'left';
				}
				if ('vertical' === config.orientation) {
					cssClass += 'up';
				}
				listener = arrowClickBackward;
				break;

			case 'forward':
				if ('horizontal' === config.orientation) {
					cssClass += 'right';
				}
				if ('vertical' === config.orientation) {
					cssClass += 'down';
				}
				listener = arrowClickForward;
				break;

			default:
				cssClass += 'undefined';
				break;
		}

		arrowElements[m].classList.add(cssClass);
		arrowElements[m].append(document.createElement('span'));
		arrowElements[m].addEventListener('mousedown', listener, false);
		// append arrow element
		config.scrollbarElement.appendChild(arrowElements[m]);
	}

	// create sliderElement
	var sliderElement = document.createElement('div');
	sliderElement.classList.add('slider');
	sliderElement.style[valueAttribute] = '0';
	sliderElement.style[maxAttribute] = '0';
	sliderElement.addEventListener('mousedown', sliderMouseDown, false);

	// create sliderAreaElement and append sliderElement
	var sliderAreaElement = document.createElement('div');
	sliderAreaElement.classList.add('slider-area');
	sliderAreaElement.appendChild(sliderElement);
	sliderAreaElement.addEventListener('mousedown', sliderAreaMouseDown, false);
	sliderAreaElement.addEventListener('mouseup', sliderAreaMouseUp, false);
	sliderAreaElement.addEventListener('wheel', sliderAreaWheel, false);
	
	config.scrollbarElement.appendChild(sliderAreaElement);
	config.scrollbarElement.addEventListener('mouseenter', scrollbarMouseEnter, false);
	config.scrollbarElement.addEventListener('mouseleave', scrollbarMouseLeave, false);

	var scrollbarElementWindow = config.scrollbarElement.ownerDocument.defaultView;
	scrollbarElementWindow.addEventListener('mousemove', windowMouseMove, false);
	scrollbarElementWindow.addEventListener('mouseup', windowMouseUp, false);

	this.setSlider(this.calculateDataFromStart(config.numberOfItems.start));
}
