/**
 * PlainScrollbar
 */

function PlainScrollbar(options) {
	
	/* functions */
	
	function log() {
		console.log.apply(null, arguments);
	}
	
	function extend(obj, src) {
		Object.keys(src).forEach(function(key) {
			obj[key] = src[key];
		});
		return obj;
	}
	
	this.calculateDataFromStart = function(start) {

		start = parseFloat(start);

		var maxStart = this.options.numberOfItems.total - this.options.numberOfItems.visible;
		
		if (start > maxStart) {
			// TODO ?: Warn about inconsistency.
			start = maxStart;
		}
		
		var data = {
			value: 0,
			type: '',
			source: 'start',
		};

		// calculate dataValue
		var scrollbarBoundingClientRect = this.scrollbarElement.getBoundingClientRect(),
			itemSize = scrollbarBoundingClientRect[this.maxAttribute] / this.options.numberOfItems.total,
			sliderSize = Math.max(this.options.minSize, this.options.numberOfItems.visible * itemSize);

		data.value = (scrollbarBoundingClientRect[this.maxAttribute] - sliderSize) / (this.options.numberOfItems.total - this.options.numberOfItems.visible) * start;

		if ('horizontal' === this.options.orientation) {
			data.type = 'x';
		}
		if ('vertical' === this.options.orientation) {
			data.type = 'y';
		}
		
		return data;
	};

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
				var scrollbarBoundingClientRect = this.scrollbarElement.getBoundingClientRect(),
					offset = scrollbarBoundingClientRect[this.valueAttribute];
				
				if ('horizontal' === this.options.orientation) {
					data.type = 'x';
					data.value = event.pageX - offset;
				}
				if ('vertical' === this.options.orientation) {
					data.type = 'y';
					data.value = event.pageY - offset;
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

			break;
		}
		
		return data;
	};
	
	this.setNumberOfItems = function(numberOfItems, executeCallback) {
		if (isSliderDrag) {
			executeCallback = false;
		}
		
		// TODO: Validate total, visible, start
		this.options.numberOfItems = extend(this.options.numberOfItems, numberOfItems);
		this.setSlider(this.calculateDataFromStart(this.options.numberOfItems.start), executeCallback);
	};
	
	this.setSlider = function(data, executeCallback) {
		// log('setSlider', data, executeCallback);
		var dataValue = (isNaN(data.value)) ? 0 : parseFloat(data.value);

		executeCallback = (executeCallback !== false);

		// log('setSlider', data, executeCallback);
		
		// calculate newValue and newStart
		var scrollbarBoundingClientRect = this.scrollbarElement.getBoundingClientRect(),
			scrollbarSize = scrollbarBoundingClientRect[this.maxAttribute],
			sliderBoundingClientRect = this.sliderElement.getBoundingClientRect(),
			itemSize = scrollbarBoundingClientRect[this.maxAttribute] / this.options.numberOfItems.total,
			sliderSize = Math.max(this.options.minSize, this.options.numberOfItems.visible * itemSize);

		var currentValue = parseFloat(this.sliderElement.style[this.valueAttribute]),
			maxValue = scrollbarSize - sliderSize,
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
	
		// validate newValue against minValue/maxValue
		if (newValue < minValue) {
			newValue = minValue;
		}
		if (newValue > maxValue) {
			newValue = maxValue;
		}

		// calculate newStart
		/**
		 *	start / value = (total - visible) / (scrollbarSize - sliderSize)
		 */
		var newStart = (this.options.numberOfItems.total - this.options.numberOfItems.visible) / (scrollbarSize - sliderSize) * newValue;

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
	
	/* scrollbarElement event listener */

	function scrollbarMouseEnter(event) {
		event.preventDefault();
		self.scrollbarElement.setAttribute('data-visible', true);
	}

	function scrollbarMouseLeave(event) {
		event.preventDefault();
		if (!isSliderDrag && !self.options.alwaysVisible) {
			self.scrollbarElement.setAttribute('data-visible', false);
		}
	}

	function scrollbarMouseDown(event) {
		event.preventDefault();
		self.setSlider(self.extractDataFromEvent(event));
	}

	function scrollbarMouseUp(event) {
		if (!isSliderDrag) {
			return;
		}
		
		event.preventDefault();
		self.setSlider(self.extractDataFromEvent(event));
		isSliderDrag = false;
	}

	function scrollbarMouseWheel(event) {
		if (isSliderDrag) {
			return;
		}
		
		event.preventDefault();
		self.setSlider(self.extractDataFromEvent(event));
	}
	
	/* sliderElement event listener */
	
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
	
	/* window event listener */
	
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

	/*
	 * Init
	 */

	log('PlainScrollbar:constructor:arguments', arguments);

	var defaultOptions = {
			minSize: 20,
		},
		eventTimeout = null,
		isSliderDrag = false,
		sliderOffset = 0,
		self = this;
	
	this._isLowerMinSize = false;
	
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
	this.scrollbarElement.setAttribute('data-active', false);
	for (var i = 0; i < this.cssClasses.length; i++) {
		this.scrollbarElement.classList.add(this.cssClasses[i]);
	}

	// create sliderElement
	this.sliderElement = document.createElement("div");
	this.sliderElement.classList.add('slider');
	this.sliderElement.style.position = 'relative';
	this.sliderElement.style[this.valueAttribute] = 0;
	this.sliderElement.style[this.maxAttribute] = 0;
	
	// append sliderElement
	this.scrollbarElement.appendChild(this.sliderElement);
	
	if (this.options.alwaysVisible) {
		this.scrollbarElement.setAttribute('data-visible', true);
	}
	
	this.scrollbarElement.addEventListener('mouseenter', scrollbarMouseEnter, false);
	this.scrollbarElement.addEventListener('mouseleave', scrollbarMouseLeave, false);
	this.scrollbarElement.addEventListener('mousedown', scrollbarMouseDown, false);
	this.scrollbarElement.addEventListener('mouseup', scrollbarMouseUp, false);
	this.scrollbarElement.addEventListener('wheel', scrollbarMouseWheel, false);

	this.sliderElement.addEventListener('mousedown', sliderMouseDown, false);

	this.setSlider(this.calculateDataFromStart(this.options.numberOfItems.start));

	var scrollbarElementWindow = this.scrollbarElement.ownerDocument.defaultView;
	scrollbarElementWindow.addEventListener('mousemove', windowMouseMove, false);
	scrollbarElementWindow.addEventListener('mouseup', windowMouseUp, false);
}
/* end of PlainScrollbar */
