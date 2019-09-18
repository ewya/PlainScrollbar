/**
 * Construct a PlainScrollbar instance.
 * @param customConfiguration
 * @constructor
 */
function PlainScrollbar(customConfiguration) {

	/** Public functions */

	/**
	 * Calculates a data object by an event that can be used for calling setSlider.
	 * @param start
	 * @returns {{source: string, type: string, value: number}}
	 */
	this.calculateDataFromStart = function(start) {

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
			sliderSize = Math.max(configuration.sliderMinSize, configuration.numberOfItems.visible * itemSize);

		/**
		 *	start / value = (total - visible) / (sliderAreaSize - sliderSize)
		 */

		var maxValue = sliderAreaSize - sliderSize;

		data.value = maxValue / (configuration.numberOfItems.total - configuration.numberOfItems.visible) * start;

		if ('horizontal' === configuration.orientation) {
			data.type = 'x';
		}
		if ('vertical' === configuration.orientation) {
			data.type = 'y';
		}

		return data;
	};

	/**
	 * Calculates a data object by a (number of items) start value that can be used for calling setSlider.
	 * @param event
	 * @returns {{source: string, type: string, value: number}}
	 */
	this.calculateDataFromEvent = function(event) {
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
	};

	/**
	 * Set the number of items, then call setSlider.
	 * @param numberOfItems
	 * @param preventCallbackExecution
	 */
	this.setNumberOfItems = function(numberOfItems, preventCallbackExecution) {
		// TODO: Validate total, visible, start
		configuration.numberOfItems = extend(configuration.numberOfItems, numberOfItems);
		this.setSlider(this.calculateDataFromStart(configuration.numberOfItems.start), preventCallbackExecution);
	};

	/**
	 * Set the slider.
	 * @param data
	 * @param preventCallbackExecution
	 */
	this.setSlider = function(data, preventCallbackExecution) {
		// Validate data
		var isValid = true,
			requiredDataProperties = {
				'source': ['event', 'start'],
				'type': ['delta', 'x', 'y'],
				'value': 'int'
		};

		for(var p in requiredDataProperties) {
			if (!data.hasOwnProperty(p)) {
				isValid = false;
				break;
			}
			// TODO: types ;-)
		}

		if (!isValid) {
			throw 'Parameter "data" is invalid!';
		}

		// Proceed setting slider value...

		// log('setSlider', data, executeCallback);
		var dataValue = (isNaN(data.value)) ? 0 : parseFloat(data.value),
			executeCallback = (preventCallbackExecution !== true);

		// log('setSlider', data, executeCallback);

		/** calculate newValue and newStart */

		var sliderAreaBoundingClientRect = sliderAreaElement.getBoundingClientRect(),
			sliderAreaSize = sliderAreaBoundingClientRect[maxAttribute],
			sliderBoundingClientRect = sliderElement.getBoundingClientRect(),
			itemSize = sliderAreaSize / configuration.numberOfItems.total,
			sliderSize = Math.max(configuration.sliderMinSize, configuration.numberOfItems.visible * itemSize);

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

		var newStart = (configuration.numberOfItems.total - configuration.numberOfItems.visible) / maxValue * newValue;

		configuration.numberOfItems.start = newStart;

		// adjust sliderElement valueAttribute (left or top)
		if (currentValue !== newValue) {
			sliderElement.style[valueAttribute] = newValue + 'px';
		}

		// adjust sliderElement maxAttribute (height or width)
		if (sliderBoundingClientRect[maxAttribute] !== sliderSize) {
			sliderElement.style[maxAttribute] = sliderSize + 'px';
		}

		// log('setSlider:calculated', {
		// 	numberOfItems: configuration.numberOfItems,
		// 	itemSize: itemSize,
		// 	sliderSize: sliderSize,
		// 	newStart: newStart,
		// });

		if (executeCallback) {
			// execute onUpdate callback and provide newStart
			if ('function' === typeof configuration.onUpdate) {
				// scope of 'this' is set to the PlainScrollbar instance
				this.onUpdate = configuration.onUpdate;
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
	 * Simple object extend function that is used to merge the PlainScrollbar custom customConfiguration with the default customConfiguration.
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
		configuration.scrollbarElement.setAttribute('data-visible', true);
	}

	/**
	 * Handle scrollbar mouseleave event.
	 * @param event
	 */
	function scrollbarMouseLeave(event) {
		event.preventDefault();
		if (!isSliderDrag && !configuration.alwaysVisible) {
			configuration.scrollbarElement.setAttribute('data-visible', false);
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

			self.setSlider(self.calculateDataFromStart(start));
		} else {
			self.setSlider(self.calculateDataFromEvent(event));
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
		self.setSlider(self.calculateDataFromEvent(event));
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
		self.setSlider(self.calculateDataFromEvent(event));
	}

	/** arrowElement event listener */

	/**
	 * Handle arrow (backward) click event.
	 * @param event
	 */
	function arrowClickBackward(event) {
		event.preventDefault();
		var start = configuration.numberOfItems.start -1;
		self.setSlider(self.calculateDataFromStart(start));
	}

	/**
	 * Handle arrow (forward) click event.
	 * @param event
	 */
	function arrowClickForward(event) {
		event.preventDefault();
		var start = configuration.numberOfItems.start +1;
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
		if ('horizontal' === configuration.orientation) {
			sliderOffset = event.offsetX;
		}
		if ('vertical' === configuration.orientation) {
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
			self.setSlider(self.calculateDataFromEvent(event));
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
			configuration.scrollbarElement.setAttribute('data-visible', false);
		}
		self.setSlider(self.calculateDataFromEvent(event));
		isSliderDrag = false;
	}

	/**
	 * Init
	 */

	log('PlainScrollbar:constructor:arguments', arguments);

	var defaultConfiguration = {
			/**
			 * Configure that the scrollbar is always visible.
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
	
	// configuration etc
	
	// TODO: validate required configuration!
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

	var configuration = extend(defaultConfiguration, customConfiguration);
	log('PlainScrollbar:init:customConfiguration', configuration);

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

	// determine scrollbarElement
	configuration.scrollbarElement.setAttribute('data-visible', (configuration.alwaysVisible === true));
	for (var i = 0; i < cssClasses.length; i++) {
		configuration.scrollbarElement.classList.add(cssClasses[i]);
	}

	// determine arrowElements and create them if configurationured.
	var arrowElements = {};
	if (configuration.arrows) {
		configuration.scrollbarElement.classList.add('has-arrows');
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
		arrowElements[m].append(document.createElement('span'));
		arrowElements[m].addEventListener('mousedown', listener, false);
		// append arrow element
		configuration.scrollbarElement.appendChild(arrowElements[m]);
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
	
	configuration.scrollbarElement.appendChild(sliderAreaElement);
	configuration.scrollbarElement.addEventListener('mouseenter', scrollbarMouseEnter, false);
	configuration.scrollbarElement.addEventListener('mouseleave', scrollbarMouseLeave, false);

	var scrollbarElementWindow = configuration.scrollbarElement.ownerDocument.defaultView;
	scrollbarElementWindow.addEventListener('mousemove', windowMouseMove, false);
	scrollbarElementWindow.addEventListener('mouseup', windowMouseUp, false);

	this.setSlider(this.calculateDataFromStart(configuration.numberOfItems.start));
}
