/**
 * @preserve jQuery Multiple Select Box Plugin %Revision%
 * 
 * http://plugins.jquery.com/jQueryMultipleSelectBox/
 * http://code.google.com/p/jquerymultipleselectbox/
 * 
 * Apache License 2.0 - http://www.apache.org/licenses/LICENSE-2.0
 * 
 * @author Dreamltf
 * @date %BuiltDate%
 * 
 * Depends: jquery.js(1.2+), multipleselectbox.css
 */
(function($) {
	/* static variables */
	var PLUGIN_NAMESPACE = "MultipleSelectBox";
	var PLUGIN_FILTER_NAMESPACE = "MultipleSelectBoxFilter";
	var PLUGIN_MODE_AUTO = "auto";
	var PLUGIN_ATTR_VALUE_RENDER = "value-render";
	var PLUGIN_STYLE_HORIZONTAL = "horizontal";
	var PLUGIN_STYLE_VERTICAL = "vertical";
	var PLUGIN_STYLE_POPUP = "popup";
	var PLUGIN_STYLE_DISABLED = "disabled";
	var PLUGIN_STYLE_SELECTED = "selected";
	var PLUGIN_STYLE_SELECTING = "selecting";
	var PLUGIN_STYLE_OPTGROUP = "optgroup";
	var PLUGIN_STYLE_OPTGROUPITEM = "optgroupitem";

	/* default options */
	var defaultOptions = {
		maxLimit : -1,
		scrollSpeed : 50,
		isHorizontalMode : false,
		isPopupMode : false,
		isTouchDeviceMode : PLUGIN_MODE_AUTO,
		isMouseEventEnabled : true,
		isKeyEventEnabled : true,
		/* form options */
		submitField : null,
		/* filter options */
		isFilterEnabled : true,
		filterField : null,
		/* callback function */
		onCreate : null,
		onSelectStart : null,
		onSelectEnd : null,
		onSelectChange : null,
		/* others */
		scrollHelper : null
	};

	/* others variables */
	var isIE = /msie/.test(navigator.userAgent.toLowerCase());
	var isTouchDevice = !!("ontouchstart" in window);
	var scrollBarSize = 16;

	/**
	 * Public Method
	 */
	$.extend($.fn, {
		/**
		 * Public : Main method
		 * 
		 * @param options
		 *            Object
		 * @return jQuery
		 */
		multipleSelectBox : function(options) {
			options = $.extend({}, defaultOptions, options);
			/* correct options */
			if (options.isTouchDeviceMode == PLUGIN_MODE_AUTO) {
				options.isTouchDeviceMode = isTouchDevice;
			}
			if (options.scrollHelper == null) {
				options.scrollHelper = defaultScrollHelper;
			}
			/* starting */
			return this.each(function() {
				var $container = $(this);
				/* destroy */
				$container.destroyMultipleSelectBox();
				/* prepare className */
				$container.addClass(PLUGIN_NAMESPACE).addClass(options.isHorizontalMode ? PLUGIN_STYLE_HORIZONTAL : PLUGIN_STYLE_VERTICAL);
				if (options.isPopupMode) {
					$container.addClass(PLUGIN_STYLE_POPUP);
				}
				/* disable text selection and give the focus */
				$container.css({
					userSelect : "none",
					KhtmlUserSelect : "none",
					MozUserSelect : "none",
					WebkitUserSelect : "none"
				}).attr({
					unselectable : "on",
					tabindex : 0
				}).bind("selectstart." + PLUGIN_NAMESPACE, function(e) {
					e.preventDefault();
					return false;
				});
				/* prepare options */
				$container.data("options", options);
				/* correct options */
				var submitField = options.submitField;
				if (submitField != null && typeof submitField == "string") {
					var $submitField = $("input[name=" + submitField + "]");
					options.submitField = ($submitField.length > 0 ? $submitField : $("<input type='hidden' name='" + submitField + "'/>").insertAfter($container));
				}
				if (options.isFilterEnabled) {
					var filterField = options.filterField;
					if (filterField == null) {
						filterField = $("<div>Search: <input type='text' size='20'/></div>").insertAfter($container);
					} else if (typeof filterField == "string") {
						filterField = $("#" + filterField);
					}
					options.filterField = filterField.addClass(PLUGIN_FILTER_NAMESPACE + " " + PLUGIN_STYLE_DISABLED);
				}
				/* touch scroll supported for ios5+ only */
				/* $container.css("-webkit-overflow-scrolling", "touch"); */
				/* initialize */
				initializeMultipleSelectBox($container);
				/* callback function, for external trigger only */
				if (options.onCreate != null) {
					$container.bind("onCreate." + PLUGIN_NAMESPACE, options.onCreate);
				}
				if (options.onSelectStart != null) {
					$container.bind("onSelectStart." + PLUGIN_NAMESPACE, options.onSelectStart);
				}
				if (options.onSelectEnd != null) {
					$container.bind("onSelectEnd." + PLUGIN_NAMESPACE, options.onSelectEnd);
				}
				if (options.onSelectChange != null) {
					$container.bind("onSelectChange." + PLUGIN_NAMESPACE, options.onSelectChange);
				}
				/* trigger event */
				if (options.onCreate != null) {
					options.onCreate.apply($container[0]);
				}
			});
		},

		/**
		 * Public : Get container's cached rows
		 * 
		 * @param selector
		 *            String
		 * @return jQuery
		 */
		getMultipleSelectBoxCachedRows : function(selector) {
			return this.pushStack($.map(this, function(container) {
				var $container = $(container);
				var $rows = $container.data("rows");
				if ($rows == null) {
					/* cache rows if necessary */
					$rows = $container.children();
					$container.data("rows", $rows);
				}
				if (selector != null) {
					$rows = $rows.filter(selector);
				}
				return $rows.get();
			}));
		},

		/**
		 * Public : Clear container's cached rows
		 * 
		 * @return jQuery
		 */
		clearMultipleSelectBoxCachedRows : function() {
			return this.removeData("rows");
		},

		/**
		 * Public : Refresh container
		 * 
		 * @return jQuery
		 */
		refreshMultipleSelectBox : function() {
			return this.clearMultipleSelectBoxCachedRows();
		},

		/**
		 * Public : Get container's selected rows
		 * 
		 * @return jQuery
		 */
		getMultipleSelectBoxSelectedRows : function() {
			return $.grep(this.getMultipleSelectBoxCachedRows(), function(row) {
				var $childRow = $(row);
				return ($childRow.isMultipleSelectBoxRowSelectable() && $childRow.isMultipleSelectBoxRowSelected());
			});
		},

		/**
		 * Public : Get option group row's items
		 * 
		 * @param selector
		 *            String
		 * @return jQuery
		 */
		getMultipleSelectBoxOptGroupItems : function(selector) {
			return this.pushStack($.map(this, function(optGroupRow) {
				var $optGroupRow = $(optGroupRow);
				/* nextUntil */
				var resultArray = [];
				var $childGroupItem = $optGroupRow;
				while (($childGroupItem = $childGroupItem.next()).length > 0 && $childGroupItem.isMultipleSelectBoxRowOptGroupItem()) {
					resultArray.push($childGroupItem[0]);
				}
				if (selector != null) {
					resultArray = $optGroupRow.pushStack(resultArray).filter(selector).get();
				}
				return resultArray;
			}));
		},

		/**
		 * Public : Get row's index
		 * 
		 * @param $container
		 *            jQuery
		 * @return Number
		 */
		getMultipleSelectBoxRowIndex : function($container) {
			var $row = this;
			if ($container == null) {
				$container = $row.parent();
			}
			return $container.getMultipleSelectBoxCachedRows().index($row);
		},

		/**
		 * Public : Get container's options
		 * 
		 * @return Object
		 */
		getMultipleSelectBoxOptions : function() {
			return this.data("options");
		},

		/**
		 * Public : Get container's history
		 * 
		 * @return Object
		 */
		getMultipleSelectBoxHistory : function() {
			var $container = this;
			var containerHistory = $container.data("history");
			if (containerHistory == null) {
				containerHistory = {
					selectingStartIndex : -1,
					selectingCurrentIndex : -1,
					selectedStartIndex : -1,
					selectedCurrentIndex : -1,
					selectedRows : null
				};
				$container.data("history", containerHistory);
			}
			return containerHistory;
		},

		/**
		 * Public : Clear container's history
		 * 
		 * @return jQuery
		 */
		clearMultipleSelectBoxHistory : function() {
			return this.removeData("history");
		},

		/**
		 * Public : Draw range
		 * 
		 * @param startIndex
		 *            int
		 * @param currentIndex
		 *            int
		 * @param drawOption
		 *            Object
		 * @return jQuery
		 */
		drawMultipleSelectBox : function(startIndex, currentIndex, drawOption) {
			drawOption = $.extend({
				isSelectionOpposite : false,
				isSelectionRetained : false,
				scrollPos : -1
			}, drawOption);
			return this.each(function() {
				var $container = $(this);
				var $rows = $container.getMultipleSelectBoxCachedRows();
				var rowSize = $rows.length;
				var options = $container.getMultipleSelectBoxOptions();
				var maxLimit = options.maxLimit;
				/* remove invalid or duplicated request */
				if (startIndex < 0 || currentIndex < 0 || startIndex >= rowSize || currentIndex >= rowSize || maxLimit == 0 || !$rows.eq(startIndex).isMultipleSelectBoxRowSelectable()) {
					return;
				}
				var minIndex = Math.min(startIndex, currentIndex);
				var maxIndex = Math.max(startIndex, currentIndex);
				/* prepare unselected or selecting array */
				var unselectedArray = [];
				var selectingArray = [];
				var selectedCount = 0;
				$rows.each(function(index) {
					var $childRow = $(this);
					if ($childRow.isMultipleSelectBoxSelecting()) {
						$childRow.removeClass(PLUGIN_STYLE_SELECTING);
					}
					if ($childRow.isMultipleSelectBoxRowSelectable()) {
						var isRowSelected = $childRow.isMultipleSelectBoxRowSelected();
						if (minIndex <= index && index <= maxIndex) {
							if (isRowSelected) {
								if (drawOption.isSelectionOpposite) {
									unselectedArray.push($childRow);
								} else {
									selectedCount++;
								}
							} else {
								selectingArray.push($childRow);
							}
						} else if (isRowSelected) {
							if (drawOption.isSelectionRetained) {
								selectedCount++;
							} else {
								unselectedArray.push($childRow);
							}
						}
					}
				});
				var selectingArraySize = selectingArray.length;
				/* calculate max limit */
				if (maxLimit > 0 && (selectingArraySize + selectedCount) > maxLimit) {
					return;
				}
				/* reset all style if necessary */
				$rows.eq(currentIndex).addClass(PLUGIN_STYLE_SELECTING);
				for (var i = unselectedArray.length - 1; i >= 0; i--) {
					unselectedArray[i].removeClass(PLUGIN_STYLE_SELECTED);
				}
				for (var i = selectingArraySize - 1; i >= 0; i--) {
					selectingArray[i].addClass(PLUGIN_STYLE_SELECTED);
				}
				/* reset scroll bar */
				var scrollPos = drawOption.scrollPos;
				if (scrollPos != null) {
					if (scrollPos < 0) {
						scrollPos = calculateScrollPositionByCurrentIndex($container, startIndex, currentIndex);
					}
					if (scrollPos != null && scrollPos >= 0) {
						if (options.isHorizontalMode) {
							$container.scrollLeft(scrollPos);
						} else {
							$container.scrollTop(scrollPos);
						}
					}
				}
				/* reset history */
				var containerHistory = $container.getMultipleSelectBoxHistory();
				containerHistory.selectingStartIndex = startIndex;
				containerHistory.selectingCurrentIndex = currentIndex;
			});
		},

		/**
		 * Public : Serialize all of selected values into an Array
		 * 
		 * @return Array
		 */
		serializeMultipleSelectBoxArray : function() {
			return $.map(this.getMultipleSelectBoxSelectedRows(), function(row) {
				var $childRow = $(row);
				var resultValue = ($childRow.is("[" + PLUGIN_ATTR_VALUE_RENDER + "]") ? row.getAttribute(PLUGIN_ATTR_VALUE_RENDER) : $childRow.text());
				/* trim it for IE6 and IE7 */
				return $.trim(resultValue);
			});
		},

		/**
		 * Public : Serialize all of selected values
		 * 
		 * @param separator
		 *            String
		 * @return String
		 */
		serializeMultipleSelectBox : function(separator) {
			return this.serializeMultipleSelectBoxArray().join(separator == null ? "," : separator);
		},

		/**
		 * Public : Yield event control
		 * 
		 * @return jQuery
		 */
		yieldMultipleSelectBox : function() {
			unbindEvents($(document), [ "mouseleave", "mousemove" ]);
			return unbindEvents(this, [ "mouseenter", "mouseleave", "mouseover", "touchmove" ]);
		},

		/**
		 * Public : Destroy MultipleSelectBox
		 * 
		 * @return jQuery
		 */
		destroyMultipleSelectBox : function() {
			/* don't unbind the document's mouseup event */
			return this.yieldMultipleSelectBox().each(function() {
				var $container = $(this);
				var options = $container.getMultipleSelectBoxOptions();
				/* reset event handler */
				if (options != null) {
					unbindEvents(options.submitField, [ "click" ]);
				}
				unbindEvents($container, [ "selectstart", "mousedown", "mouseup", "keydown", "touchstart", "focus", "blur", "onCreate", "onSelectStart", "onSelectEnd", "onSelectChange" ]);
				unbindEvents($container.getMultipleSelectBoxCachedRows(), [ "dblclick" ]);
				/* clear cache */
				$container.clearMultipleSelectBoxCachedRows().clearMultipleSelectBoxHistory().removeData("options");
			});
		},

		/**
		 * Public : Is container selecting
		 * 
		 * @return boolean
		 */
		isMultipleSelectBoxSelecting : function() {
			return this.hasClass(PLUGIN_STYLE_SELECTING);
		},

		/**
		 * Public : Is row disabled
		 * 
		 * @return boolean
		 */
		isMultipleSelectBoxRowDisabled : function() {
			return this.hasClass(PLUGIN_STYLE_DISABLED);
		},

		/**
		 * Public : Is row selected
		 * 
		 * @return boolean
		 */
		isMultipleSelectBoxRowSelected : function() {
			return this.hasClass(PLUGIN_STYLE_SELECTED);
		},

		/**
		 * Public : Is row selecting
		 * 
		 * @return boolean
		 */
		isMultipleSelectBoxRowSelecting : function() {
			return this.hasClass(PLUGIN_STYLE_SELECTING);
		},

		/**
		 * Public : Is row opt group
		 * 
		 * @return boolean
		 */
		isMultipleSelectBoxRowOptGroup : function() {
			return this.hasClass(PLUGIN_STYLE_OPTGROUP);
		},

		/**
		 * Public : Is row opt group item
		 * 
		 * @return boolean
		 */
		isMultipleSelectBoxRowOptGroupItem : function() {
			return this.hasClass(PLUGIN_STYLE_OPTGROUPITEM);
		},

		/**
		 * Public : Is row selectable
		 * 
		 * @return boolean
		 */
		isMultipleSelectBoxRowSelectable : function() {
			return (!this.isMultipleSelectBoxRowDisabled() && !this.isMultipleSelectBoxRowOptGroup());
		},

		/**
		 * Public : Select row
		 * 
		 * @returns jQuery
		 */
		selectMultipleSelectBoxRow : function() {
			return this.filter(":not(." + PLUGIN_STYLE_DISABLED + ",." + PLUGIN_STYLE_OPTGROUP + ")").addClass(PLUGIN_STYLE_SELECTED);
		},

		/**
		 * Public : Unselect row
		 * 
		 * @returns jQuery
		 */
		unselectMultipleSelectBoxRow : function() {
			return this.removeClass(PLUGIN_STYLE_SELECTED + " " + PLUGIN_STYLE_SELECTING);
		},

		/**
		 * Public : Select all rows
		 * 
		 * @returns jQuery
		 */
		selectAllMultipleSelectBoxRows : function() {
			this.getMultipleSelectBoxCachedRows().selectMultipleSelectBoxRow();
			return this;
		},

		/**
		 * Public : Unselect all rows
		 * 
		 * @returns jQuery
		 */
		unselectAllMultipleSelectBoxRows : function() {
			this.getMultipleSelectBoxCachedRows().unselectMultipleSelectBoxRow();
			return this;
		},

		/**
		 * Public : Enable row
		 * 
		 * @returns jQuery
		 */
		enableMultipleSelectBoxRow : function() {
			return this.removeClass(PLUGIN_STYLE_DISABLED);
		},

		/**
		 * Public : Disable row
		 * 
		 * @returns jQuery
		 */
		disableMultipleSelectBoxRow : function() {
			return this.addClass(PLUGIN_STYLE_DISABLED);
		},

		/**
		 * Public : Get container or row's viewport
		 * 
		 * @return Object
		 */
		getMultipleSelectBoxViewport : function() {
			var $container = this;
			var container = $container[0];
			var containerOffset = $container.offset();
			return {
				getScrollLeft : function() {
					return $container.scrollLeft();
				},
				getScrollTop : function() {
					return $container.scrollTop();
				},
				getWidth : function(isOuter) {
					return (isOuter ? $container.outerWidth() : $container.innerWidth());
				},
				getHeight : function(isOuter) {
					return (isOuter ? $container.outerHeight() : $container.innerHeight());
				},
				getScrollWidth : function() {
					return container.scrollWidth;
				},
				getScrollHeight : function() {
					return container.scrollHeight;
				},
				getLeftPos : function(relativedViewport) {
					return containerOffset.left - (relativedViewport != null ? relativedViewport.getLeftPos() : 0);
				},
				getTopPos : function(relativedViewport) {
					return containerOffset.top - (relativedViewport != null ? relativedViewport.getTopPos() : 0);
				},
				getRightPos : function(relativedViewport) {
					return this.getLeftPos(relativedViewport) + this.getWidth(true);
				},
				getBottomPos : function(relativedViewport) {
					return this.getTopPos(relativedViewport) + this.getHeight(true);
				}
			};
		}
	});

	/**
	 * Private : Unbind Events
	 */
	function unbindEvents($jq, eventNameArray) {
		if ($jq != null) {
			for (var i = eventNameArray.length - 1; i >= 0; i--) {
				$jq.unbind(eventNameArray[i] + "." + PLUGIN_NAMESPACE);
			}
		}
		return $jq;
	}

	/**
	 * Private : Fire OnSelectStart Event
	 */
	function fireOnSelectStartEvent(e, $container, startIndex) {
		var options = $container.getMultipleSelectBoxOptions();
		if (options.onSelectStart == null) {
			return true;
		}
		var isSelectEnabled = options.onSelectStart.apply($container[0], [ e, startIndex ]);
		return (typeof isSelectEnabled != "boolean" || isSelectEnabled);
	}

	/**
	 * Private : Is JQuery Collection Equals
	 */
	function isJQueryCollectionEquals($jq1, $jq2) {
		return ($jq1.not($jq2).length == 0 && $jq2.not($jq1).length == 0);
	}

	/**
	 * Private : Get Previous Available Selectable Row Index
	 */
	function getPreviousAvailableSelectableRowIndex($container, index) {
		var $rows = $container.getMultipleSelectBoxCachedRows();
		index -= 1;
		if (index < 0 || index >= $rows.length) {
			return -1;
		}
		if (!$rows.eq(index).isMultipleSelectBoxRowSelectable()) {
			return getPreviousAvailableSelectableRowIndex($container, index);
		}
		return index;
	}

	/**
	 * Private : Get Next Available Selectable Row Index
	 */
	function getNextAvailableSelectableRowIndex($container, index) {
		var $rows = $container.getMultipleSelectBoxCachedRows();
		index += 1;
		if (index < 0 || index >= $rows.length) {
			return -1;
		}
		if (!$rows.eq(index).isMultipleSelectBoxRowSelectable()) {
			return getNextAvailableSelectableRowIndex($container, index);
		}
		return index;
	}

	/**
	 * Private : Calculate Scroll Position By Current Index
	 */
	function calculateScrollPositionByCurrentIndex($container, startIndex, currentIndex) {
		var $rows = $container.getMultipleSelectBoxCachedRows();
		var rowSize = $rows.length;
		if (startIndex < 0 || currentIndex < 0 || startIndex >= rowSize || currentIndex >= rowSize) {
			return null;
		}
		/* starting */
		/* don't remove duplicated request */
		var options = $container.getMultipleSelectBoxOptions();
		var containerViewport = $container.getMultipleSelectBoxViewport();
		var containerScrollPos = containerViewport.getScrollTop();
		var containerVisibleRange = containerViewport.getHeight();
		var relativedViewport = (rowSize > 0 ? $rows.eq(0).getMultipleSelectBoxViewport() : null);
		var currentRowViewport = $rows.eq(currentIndex).getMultipleSelectBoxViewport();
		var currentRowBackPos = currentRowViewport.getTopPos(relativedViewport);
		var currentRowFrontPos = currentRowViewport.getBottomPos(relativedViewport);
		if (options.isHorizontalMode) {
			containerScrollPos = containerViewport.getScrollLeft();
			containerVisibleRange = containerViewport.getWidth();
			currentRowBackPos = currentRowViewport.getLeftPos(relativedViewport);
			currentRowFrontPos = currentRowViewport.getRightPos(relativedViewport);
		}
		var containerHistory = $container.getMultipleSelectBoxHistory();
		var lastCurrentIndex = containerHistory.selectingCurrentIndex;
		var scrollPos = null;
		if (startIndex < currentIndex || (startIndex == currentIndex && lastCurrentIndex >= 0 && lastCurrentIndex < currentIndex)) {
			if (currentRowFrontPos < containerScrollPos || currentRowFrontPos - containerVisibleRange > containerScrollPos) {
				scrollPos = currentRowFrontPos - containerVisibleRange;
			}
		} else if (startIndex > currentIndex || (startIndex == currentIndex && (lastCurrentIndex < 0 || lastCurrentIndex > currentIndex))) {
			if (currentRowBackPos < containerScrollPos || currentRowBackPos + containerVisibleRange < containerScrollPos) {
				scrollPos = currentRowBackPos;
			}
		}
		return scrollPos;
	}

	/**
	 * Private : Initialize MultipleSelectBox MouseEvent
	 */
	function initializeMultipleSelectBoxMouseEvent($container) {
		var $document = $(document);
		/* process container event */
		$container.bind("mousedown." + PLUGIN_NAMESPACE, function(e) {
			/* disable text selection */
			e.preventDefault();
			/* starting row */
			var target = e.target;
			var $target = $(target);
			var $startRow = $target;
			/* correct the focus for chrome */
			if (target == this) {
				return;
			} else if ($target.parent()[0] != this) {
				target.focus();
				$startRow = $target.parents("." + PLUGIN_NAMESPACE + ">*").eq(0);
			} else {
				this.focus();
			}
			var startIndex = $startRow.getMultipleSelectBoxRowIndex($container);
			var currentIndex = startIndex;
			/* trigger callback */
			if (!fireOnSelectStartEvent(e, $container, startIndex)) {
				return;
			}
			/* prepare info for drawing */
			var options = $container.getMultipleSelectBoxOptions();
			var containerHistory = $container.getMultipleSelectBoxHistory();
			/* opposite and retain selection for touch device */
			var isTouchDeviceMode = options.isTouchDeviceMode;
			var isSelectionOpposite = isTouchDeviceMode;
			var isSelectionRetained = isTouchDeviceMode;
			if (options.isKeyEventEnabled) {
				if (e.shiftKey) {
					currentIndex = startIndex;
					startIndex = containerHistory.selectingStartIndex;
				} else if (e.ctrlKey) {
					isSelectionOpposite = isSelectionRetained = true;
				}
			}
			/* starting */
			$container.addClass(PLUGIN_STYLE_SELECTING).drawMultipleSelectBox(startIndex, currentIndex, {
				isSelectionOpposite : isSelectionOpposite,
				isSelectionRetained : isSelectionRetained,
				scrollPos : null
			});
			/* listening */
			var scrollHelperFunc = function(e1) {
				options.scrollHelper(e1, $container, startIndex, isSelectionRetained);
			};
			$container.yieldMultipleSelectBox().bind("mouseenter." + PLUGIN_NAMESPACE, function() {
				unbindEvents($document, [ "mousemove" ]);
			}).bind("mouseleave." + PLUGIN_NAMESPACE, function(e1) {
				scrollHelperFunc(e1);
				$document.bind("mousemove." + PLUGIN_NAMESPACE, function(e2) {
					scrollHelperFunc(e2);
				});
			}).bind("mouseover." + PLUGIN_NAMESPACE, function(e1) {
				scrollHelperFunc(e1);
			}).one("mouseup." + PLUGIN_NAMESPACE, function(e1) {
				scrollHelperFunc(e1);
			});
			/* IE hacked for mouse up event */
			if (isIE) {
				$document.bind("mouseleave." + PLUGIN_NAMESPACE, function() {
					$document.one("mousemove." + PLUGIN_NAMESPACE, function(e1) {
						if (!e1.button) {
							validateMultipleSelectBox(e1);
						}
					});
				});
			}
		});
		/* select group items automatically */
		$container.getMultipleSelectBoxCachedRows().filter("." + PLUGIN_STYLE_OPTGROUP).bind("dblclick." + PLUGIN_NAMESPACE, function(e) {
			var $startRow = $(this);
			/* trigger callback */
			if (!fireOnSelectStartEvent(e, $container, $startRow.getMultipleSelectBoxRowIndex($container))) {
				return;
			}
			var options = $container.getMultipleSelectBoxOptions();
			var maxLimit = options.maxLimit;
			var childGroupItemList = $startRow.getMultipleSelectBoxOptGroupItems();
			var childGroupItemSelectSize = childGroupItemList.length;
			if (childGroupItemSelectSize > 0) {
				if (maxLimit > 0 && childGroupItemSelectSize > maxLimit) {
					childGroupItemSelectSize = maxLimit;
				}
				$container.drawMultipleSelectBox(childGroupItemList.eq(0).getMultipleSelectBoxRowIndex($container), childGroupItemList.eq(childGroupItemSelectSize - 1).getMultipleSelectBoxRowIndex($container), {
					scrollPos : null
				});
				/* special case */
				$container.addClass(PLUGIN_STYLE_SELECTING);
				validateMultipleSelectBox(e);
			}
		});
	}

	/**
	 * Private : Initialize MultipleSelectBox MouseEvent
	 */
	function initializeMultipleSelectBoxKeyEvent($container) {
		$container.bind("keydown." + PLUGIN_NAMESPACE, function(e) {
			if (e.target != this) {
				return;
			}
			var keyCode = e.keyCode;
			if ((keyCode >= 37 && keyCode <= 40) || keyCode == 32) {
				var containerHistory = $container.getMultipleSelectBoxHistory();
				var lastCurrentIndex = containerHistory.selectingCurrentIndex;
				/* prepare info for drawing */
				var isSelectionOpposite = false;
				var isSelectionRetained = e.shiftKey;
				if (keyCode == 37 || keyCode == 38) {
					/* left or up */
					lastCurrentIndex = getPreviousAvailableSelectableRowIndex($container, lastCurrentIndex);
				} else if (keyCode == 39 || keyCode == 40) {
					/* right or down */
					lastCurrentIndex = getNextAvailableSelectableRowIndex($container, lastCurrentIndex);
				} else if (keyCode == 32) {
					/* white space */
					isSelectionOpposite = true;
				}
				/* trigger callback */
				if (!fireOnSelectStartEvent(e, $container, lastCurrentIndex)) {
					return;
				}
				/* starting */
				$container.addClass(PLUGIN_STYLE_SELECTING).drawMultipleSelectBox(lastCurrentIndex, lastCurrentIndex, {
					isSelectionOpposite : isSelectionOpposite,
					isSelectionRetained : isSelectionRetained
				});
				validateMultipleSelectBox(e);
				return false;
			}
		});
	}

	/**
	 * Private : Initialize MultipleSelectBox TouchEvent
	 */
	function initializeMultipleSelectBoxTouchEvent($container) {
		$container.bind("touchstart." + PLUGIN_NAMESPACE, function(e) {
			var options = $container.getMultipleSelectBoxOptions();
			var containerViewport = $container.getMultipleSelectBoxViewport();
			var startTouches = e.originalEvent.touches[0];
			var startTouchPos = startTouches.pageY;
			var startContainerScrollPos = containerViewport.getScrollTop();
			if (options.isHorizontalMode) {
				startTouchPos = startTouches.pageX;
				startContainerScrollPos = containerViewport.getScrollLeft();
			}
			$container.yieldMultipleSelectBox().bind("touchmove." + PLUGIN_NAMESPACE, function(e1) {
				/* disable touch scroll */
				e1.preventDefault();
				/* calculate scroll to position */
				var thisTouches = e1.originalEvent.touches[0];
				if (options.isHorizontalMode) {
					$container.scrollLeft(startContainerScrollPos + (thisTouches.pageX - startTouchPos));
				} else {
					$container.scrollTop(startContainerScrollPos + (thisTouches.pageY - startTouchPos));
				}
			});
		});
	}

	/**
	 * Private : Initialize MultipleSelectBox Filter
	 */
	function initializeMultipleSelectBoxFilter($container) {
		var options = $container.getMultipleSelectBoxOptions();
		var containerOffset = $container.offset();
		var filterField = options.filterField;
		$container.bind("mouseenter." + PLUGIN_FILTER_NAMESPACE, function() {
			filterField.removeClass(PLUGIN_STYLE_DISABLED);
		}).bind("mouseleave." + PLUGIN_FILTER_NAMESPACE, function() {
			filterField.addClass(PLUGIN_STYLE_DISABLED);
		}).bind("focus." + PLUGIN_FILTER_NAMESPACE, function() {
			filterField.removeClass(PLUGIN_STYLE_DISABLED);
		}).bind("blur." + PLUGIN_FILTER_NAMESPACE, function() {
			filterField.addClass(PLUGIN_STYLE_DISABLED);
		});
		filterField.css({
			top : containerOffset.top + $container.height() - filterField.outerHeight(),
			left : containerOffset.left + $container.width() - filterField.outerWidth() - scrollBarSize
		}).bind("mouseenter." + PLUGIN_FILTER_NAMESPACE, function() {
			filterField.removeClass(PLUGIN_STYLE_DISABLED);
		}).bind("mouseleave." + PLUGIN_FILTER_NAMESPACE, function() {
			filterField.addClass(PLUGIN_STYLE_DISABLED);
		}).bind("focus." + PLUGIN_FILTER_NAMESPACE, function() {
			filterField.removeClass(PLUGIN_STYLE_DISABLED);
		}).bind("blur." + PLUGIN_FILTER_NAMESPACE, function() {
			filterField.addClass(PLUGIN_STYLE_DISABLED);
		});
	}

	/**
	 * Private : Initialize MultipleSelectBox
	 */
	function initializeMultipleSelectBox($container) {
		var options = $container.getMultipleSelectBoxOptions();
		/* mouse event */
		if (options.isMouseEventEnabled) {
			initializeMultipleSelectBoxMouseEvent($container);
		}
		/* key event */
		if (options.isKeyEventEnabled) {
			initializeMultipleSelectBoxKeyEvent($container);
		}
		/* touch event */
		if (options.isTouchDeviceMode) {
			initializeMultipleSelectBoxTouchEvent($container);
		}
		/* search helper */
		if (options.isFilterEnabled) {
			initializeMultipleSelectBoxFilter($container);
		}
		/* popup mode */
		if (options.isPopupMode && options.submitField != null) {
			/* click event is after than mouseup event */
			options.submitField.bind("click." + PLUGIN_NAMESPACE, function() {
				$container.slideDown("slow");
			});
		}
		return $container;
	}

	/**
	 * Private : Validate MultipleSelectBox
	 */
	function validateMultipleSelectBox(e) {
		/* yield event handler */
		return $("." + PLUGIN_NAMESPACE).yieldMultipleSelectBox().each(function() {
			var $container = $(this);
			var options = $container.getMultipleSelectBoxOptions();
			var containerHistory = $container.getMultipleSelectBoxHistory();
			if ($container.isMultipleSelectBoxSelecting()) {
				/* reset style */
				$container.removeClass(PLUGIN_STYLE_SELECTING);
				var selectedRows = $container.getMultipleSelectBoxSelectedRows();
				/* slide up */
				if (options.isPopupMode) {
					$container.slideUp("slow");
				}
				/* fire event */
				$container.trigger("mouseup." + PLUGIN_NAMESPACE);
				/* trigger callback */
				if (options.onSelectEnd != null) {
					options.onSelectEnd.apply($container[0], [ e, selectedRows, containerHistory.selectingStartIndex, containerHistory.selectingCurrentIndex, containerHistory.selectedStartIndex, containerHistory.selectedCurrentIndex ]);
				}
				if (options.onSelectChange != null && (containerHistory.selectedRows == null || !isJQueryCollectionEquals(containerHistory.selectedRows, selectedRows))) {
					options.onSelectChange.apply($container[0], [ e, selectedRows, containerHistory.selectedRows, containerHistory.selectingStartIndex, containerHistory.selectingCurrentIndex, containerHistory.selectedStartIndex, containerHistory.selectedCurrentIndex ]);
				}
				/* reset the field value */
				if (options.submitField != null) {
					options.submitField.val($container.serializeMultipleSelectBox());
				}
				containerHistory.selectedRows = selectedRows;
			}
			/* reset history */
			containerHistory.selectedStartIndex = containerHistory.selectingStartIndex;
			containerHistory.selectedCurrentIndex = containerHistory.selectingCurrentIndex;
		});
	}

	/**
	 * Private : Default Scroll Helper's Data
	 */
	var defaultScrollHelperUtils = {
		mousePos : 0,
		scrollTimer : null,
		startTimer : function(callback, millisec) {
			if (this.scrollTimer != null || callback == null) {
				return;
			}
			this.scrollTimer = setInterval(function() {
				callback();
			}, millisec);
		},
		stopTimer : function() {
			if (this.scrollTimer != null) {
				clearInterval(this.scrollTimer);
				this.scrollTimer = null;
			}
		}
	};

	/**
	 * Private : Default Scroll Helper
	 */
	function defaultScrollHelper(e, $container, startIndex, isSelectionRetained) {
		if (e.type == "mouseover") {
			/* on mouse down and than mouse over */
			var $childTarget = $(e.target);
			if ($container[0] != $childTarget.parent()[0]) {
				return;
			}
			defaultScrollHelperUtils.stopTimer();
			$container.drawMultipleSelectBox(startIndex, $childTarget.getMultipleSelectBoxRowIndex($container), {
				isSelectionRetained : isSelectionRetained,
				scrollPos : null
			});
		} else if (e.type == "mouseup") {
			/* on mouse down and than mouse up */
			defaultScrollHelperUtils.stopTimer();
		} else if (e.type == "mouseleave") {
			/* on mouse down and than mouse leave */
		} else if (e.type == "mousemove") {
			/* on mouse down and than mouse leave and moving */
			var options = $container.getMultipleSelectBoxOptions();
			var isHorizontalMode = options.isHorizontalMode;
			defaultScrollHelperUtils.mousePos = (isHorizontalMode ? e.pageX : e.pageY);
			defaultScrollHelperUtils.startTimer(function() {
				var containerViewport = $container.getMultipleSelectBoxViewport();
				var containerBackPos = containerViewport.getTopPos();
				var containerFrontPos = containerViewport.getBottomPos();
				var containerScrollPos = containerViewport.getScrollTop();
				var containerVisibleRange = containerViewport.getHeight();
				if (isHorizontalMode) {
					containerBackPos = containerViewport.getLeftPos();
					containerFrontPos = containerViewport.getRightPos();
					containerScrollPos = containerViewport.getScrollLeft();
					containerVisibleRange = containerViewport.getWidth();
				}
				var scrollToPos = containerScrollPos;
				var targetPos = scrollToPos;
				var scrollSpeed = options.scrollSpeed;
				/* mousemove event is triggered when mouse out of the box only */
				var mousePos = defaultScrollHelperUtils.mousePos;
				if (mousePos < containerBackPos) {
					scrollToPos -= scrollSpeed;
					targetPos = scrollToPos;
				} else if (mousePos > containerFrontPos) {
					scrollToPos += scrollSpeed;
					targetPos = scrollToPos + containerVisibleRange;
				}
				/* calculate cuurentIndex */
				$container.drawMultipleSelectBox(startIndex, calculateScrollHelperCurrentIndex($container, targetPos), {
					isSelectionRetained : isSelectionRetained,
					scrollPos : scrollToPos
				});
			}, 100);
		}
	}

	/**
	 * Private : Calculate Scroll Helper Current Index
	 */
	function calculateScrollHelperCurrentIndex($container, targetPos) {
		if (targetPos <= 0) {
			return 0;
		}
		/* remove first request */
		var containerHistory = $container.getMultipleSelectBoxHistory();
		var lastCurrentIndex = containerHistory.selectingCurrentIndex;
		if (lastCurrentIndex == null || lastCurrentIndex < 0) {
			return -1;
		}
		var options = $container.getMultipleSelectBoxOptions();
		var isHorizontalMode = options.isHorizontalMode;
		var containerViewport = $container.getMultipleSelectBoxViewport();
		var containerMaxRange = (isHorizontalMode ? containerViewport.getScrollWidth() : containerViewport.getScrollHeight());
		var $rows = $container.getMultipleSelectBoxCachedRows();
		var rowSize = $rows.length;
		if (targetPos >= containerMaxRange) {
			return rowSize - 1;
		}
		var relativedViewport = (rowSize > 0 ? $rows.eq(0).getMultipleSelectBoxViewport() : null);
		var targetPosRelation = compareRowViewport($rows.eq(lastCurrentIndex).getMultipleSelectBoxViewport(), relativedViewport, isHorizontalMode, targetPos);
		/* starting */
		var currentIndex = lastCurrentIndex;
		if (targetPosRelation > 0) {
			/* up */
			for (var i = lastCurrentIndex - 1; i >= 0; i--) {
				if (compareRowViewport($rows.eq(i).getMultipleSelectBoxViewport(), relativedViewport, isHorizontalMode, targetPos) == 0) {
					currentIndex = i;
					break;
				}
			}
		} else if (targetPosRelation < 0) {
			/* down */
			for (var i = lastCurrentIndex + 1; i < rowSize; i++) {
				if (compareRowViewport($rows.eq(i).getMultipleSelectBoxViewport(), relativedViewport, isHorizontalMode, targetPos) == 0) {
					currentIndex = i;
					break;
				}
			}
		}
		return currentIndex;
	}

	/**
	 * Private : Compare Row Viewport
	 */
	function compareRowViewport(rowViewport, relativedViewport, isHorizontalMode, compareToPos) {
		var rowBackPos = rowViewport.getTopPos(relativedViewport);
		var rowFrontPos = rowViewport.getBottomPos(relativedViewport);
		if (isHorizontalMode) {
			rowBackPos = rowViewport.getLeftPos(relativedViewport);
			rowFrontPos = rowViewport.getRightPos(relativedViewport);
		}
		var result = 0;
		if (rowBackPos > compareToPos) {
			result = 1;
		} else if (rowFrontPos < compareToPos) {
			result = -1;
		}
		return result;
	}

	/**
	 * Global Event Control
	 */
	$(document).bind("mouseup." + PLUGIN_NAMESPACE, function(e) {
		validateMultipleSelectBox(e);
	});

})(jQuery);