/**
 * Construct a PlainScrollbar instance.
 * @param options
 * @constructor
 */
function PlainScrollbar(options) {
	
	/** common functions */

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

	/**
	 * Calculates a data object by an event the can be used for calling setSlider.
	 * @param start
	 * @returns {{source: string, type: string, value: number}}
	 */
	this.calculateDataFromStart = function(start) {

		start = parseFloat(start);

		var maxStart = this.options.numberOfItems.total - this.options.numberOfItems.visible,
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

		var sliderAreaBoundingClientRect = this.sliderAreaElement.getBoundingClientRect(),
			sliderAreaSize = sliderAreaBoundingClientRect[this.maxAttribute],
			itemSize = sliderAreaSize / this.options.numberOfItems.total,
			sliderSize = Math.max(this.options.sliderMinSize, this.options.numberOfItems.visible * itemSize);

		/**
		 *	start / value = (total - visible) / (sliderAreaSize - sliderSize)
		 */

		var maxValue = sliderAreaSize - sliderSize;

		data.value = maxValue / (this.options.numberOfItems.total - this.options.numberOfItems.visible) * start;

		if ('horizontal' === this.options.orientation) {
			data.type = 'x';
		}
		if ('vertical' === this.options.orientation) {
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
				var sliderAreaBoundingClientRect = this.sliderAreaElement.getBoundingClientRect(),
					sliderAreaOffset = sliderAreaBoundingClientRect[this.valueAttribute];

				if ('horizontal' === this.options.orientation) {
					data.type = 'x';
					data.value = event.pageX - sliderAreaOffset;
				}
				if ('vertical' === this.options.orientation) {
					data.type = 'y';
					data.value = event.pageY - sliderAreaOffset;
				}

			break;

			case 'wheel':
				data.type = 'delta';

				if ('horizontal' === this.options.orientation) {
					data.value = (0 < event.deltaX) ? 1 : -1;
				}
				if ('vertical' === this.options.orientation) {
					data.value = (0 < event.deltaY) ? 1 : -1;
				}

				data.value *= this.options.wheelSpeed;

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
		this.options.numberOfItems = extend(this.options.numberOfItems, numberOfItems);
		this.setSlider(this.calculateDataFromStart(this.options.numberOfItems.start), preventCallbackExecution);
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

		var sliderAreaBoundingClientRect = this.sliderAreaElement.getBoundingClientRect(),
			sliderAreaSize = sliderAreaBoundingClientRect[this.maxAttribute],
			sliderBoundingClientRect = this.sliderElement.getBoundingClientRect(),
			itemSize = sliderAreaSize / this.options.numberOfItems.total,
			sliderSize = Math.max(this.options.sliderMinSize, this.options.numberOfItems.visible * itemSize);

		var currentValue = parseFloat(this.sliderElement.style[this.valueAttribute]),
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

		var newStart = (this.options.numberOfItems.total - this.options.numberOfItems.visible) / maxValue * newValue;

		this.options.numberOfItems.start = newStart;

		// adjust sliderElement valueAttribute (left or top)
		if (currentValue !== newValue) {
			this.sliderElement.style[this.valueAttribute] = newValue + 'px';
		}

		// adjust sliderElement maxAttribute (height or width)
		if (sliderBoundingClientRect[this.maxAttribute] !== sliderSize) {
			this.sliderElement.style[this.maxAttribute] = sliderSize + 'px';
		}

		// log('setSlider:calculated', {
		// 	numberOfItems: this.options.numberOfItems,
		// 	itemSize: itemSize,
		// 	sliderSize: sliderSize,
		// 	newStart: newStart,
		// });

		if (executeCallback) {
			// execute onUpdate callback and provide newStart
			if ('function' === typeof this.options.onUpdate) {
				// scope of 'this' is set to the PlainScrollbar instance
				this.onUpdate = this.options.onUpdate;
				this.onUpdate(newStart);
			}
		}
	};

	/** scrollbarElement event listener */

	/**
	 * Handle scrollbar mouseenter event.
	 * @param event
	 */
	function scrollbarMouseEnter(event) {
		event.preventDefault();
		self.scrollbarElement.setAttribute('data-visible', true);
	}

	/**
	 * Handle scrollbar mouseleave event.
	 * @param event
	 */
	function scrollbarMouseLeave(event) {
		event.preventDefault();
		if (!isSliderDrag && !self.options.alwaysVisible) {
			self.scrollbarElement.setAttribute('data-visible', false);
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
		if (self.options.movePageByPageOnAreaClick) {
			var start = self.options.numberOfItems.start,
				visible = self.options.numberOfItems.visible,
				currentValue = parseFloat(self.sliderElement.style[self.valueAttribute]),
				value = currentValue;

			switch(self.options.orientation) {
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
		var start = self.options.numberOfItems.start -1;
		self.setSlider(self.calculateDataFromStart(start));
	}

	/**
	 * Handle arrow (forward) click event.
	 * @param event
	 */
	function arrowClickForward(event) {
		event.preventDefault();
		var start = self.options.numberOfItems.start +1;
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
		if ('horizontal' === self.options.orientation) {
			sliderOffset = event.offsetX;
		}
		if ('vertical' === self.options.orientation) {
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
		if (!self.options.alwaysVisible) {
			self.scrollbarElement.setAttribute('data-visible', false);
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

	this.options = extend(defaultOptions, options);
	log('PlainScrollbar:init:options', this.options);

	this.cssClasses = [
		'plain-scrollbar',
		'scrollbar-' + this.options.orientation,
	];
		
	this.maxAttribute = null;
	this.valueAttribute = null;
	
	if ('horizontal' === this.options.orientation) {
		this.maxAttribute = 'width';
		this.valueAttribute = 'left';
	}
	if ('vertical' === this.options.orientation) {
		this.maxAttribute = 'height';
		this.valueAttribute = 'top';
	}

	// determine scrollbarElement
	this.scrollbarElement = this.options.scrollbarElement;
	this.scrollbarElement.setAttribute('data-visible', (this.options.alwaysVisible === true));
	for (var i = 0; i < this.cssClasses.length; i++) {
		this.scrollbarElement.classList.add(this.cssClasses[i]);
	}

	// determine arrowElements and create them if configured.
	this.arrowElements = {};
	if (this.options.arrows) {
		this.scrollbarElement.classList.add('has-arrows');
		// create arrow elements
		this.arrowElements = {
			'backward': document.createElement('div'),
			'forward': document.createElement('div'),
		};
	}

	for(var m in this.arrowElements) {
		if (!this.arrowElements.hasOwnProperty(m)) {
			continue;
		}

		var cssClass = 'arrow-',
			listener = function(){};

		switch(m) {
			case 'backward':
				if ('horizontal' === this.options.orientation) {
					cssClass += 'left';
				}
				if ('vertical' === this.options.orientation) {
					cssClass += 'up';
				}
				listener = arrowClickBackward;
				break;

			case 'forward':
				if ('horizontal' === this.options.orientation) {
					cssClass += 'right';
				}
				if ('vertical' === this.options.orientation) {
					cssClass += 'down';
				}
				listener = arrowClickForward;
				break;

			default:
				cssClass += 'undefined';
				break;
		}

		this.arrowElements[m].classList.add(cssClass);
		this.arrowElements[m].append(document.createElement('span'));
		this.arrowElements[m].addEventListener('mousedown', listener, false);
		// append arrow element
		this.scrollbarElement.appendChild(this.arrowElements[m]);
	}

	// create sliderElement
	this.sliderElement = document.createElement('div');
	this.sliderElement.classList.add('slider');
	this.sliderElement.style[this.valueAttribute] = '0';
	this.sliderElement.style[this.maxAttribute] = '0';
	this.sliderElement.addEventListener('mousedown', sliderMouseDown, false);

	// create sliderAreaElement and append sliderElement
	this.sliderAreaElement = document.createElement('div');
	this.sliderAreaElement.classList.add('slider-area');
	this.sliderAreaElement.appendChild(this.sliderElement);
	this.sliderAreaElement.addEventListener('mousedown', sliderAreaMouseDown, false);
	this.sliderAreaElement.addEventListener('mouseup', sliderAreaMouseUp, false);
	this.sliderAreaElement.addEventListener('wheel', sliderAreaWheel, false);
	
	this.scrollbarElement.appendChild(this.sliderAreaElement);
	this.scrollbarElement.addEventListener('mouseenter', scrollbarMouseEnter, false);
	this.scrollbarElement.addEventListener('mouseleave', scrollbarMouseLeave, false);
	
	this.setSlider(this.calculateDataFromStart(this.options.numberOfItems.start));

	var scrollbarElementWindow = this.scrollbarElement.ownerDocument.defaultView;
	scrollbarElementWindow.addEventListener('mousemove', windowMouseMove, false);
	scrollbarElementWindow.addEventListener('mouseup', windowMouseUp, false);
}
