/**
 * @preserve jQuery Multiple Select Box Plugin %Revision%
 * 
 * http://plugins.jquery.com/project/jquerymultipleselectbox
 * http://code.google.com/p/jquerymultipleselectbox/
 * 
 * Apache License 2.0 - http://www.apache.org/licenses/LICENSE-2.0
 * 
 * @author Dreamltf
 * @date %BuiltDate%
 * 
 * Depends: jquery.js (1.2+)
 */
(function($) {
	/* static variables */
	var PLUGIN_NAMESPACE = "MultipleSelectBox";
	var PLUGIN_MODE_AUTO = "auto";
	var PLUGIN_VALUE_RENDER_ATTR = "value-render";
	var PLUGIN_STYLE_HORIZONTAL = "horizontal";
	var PLUGIN_STYLE_VERTICAL = "vertical";
	var PLUGIN_STYLE_DISABLED = "disabled";
	var PLUGIN_STYLE_SELECTED = "selected";
	var PLUGIN_STYLE_SELECTING = "selecting";
	var PLUGIN_STYLE_OPTGROUP = "optgroup";
	var PLUGIN_STYLE_OPTGROUPITEM = "optgroupitem";

	/* other variables */
	var isTouchDevice = (!!("ontouchstart" in window) || !!("onmsgesturechange" in window));
	var isIE = /msie/.test(navigator.userAgent.toLowerCase());
	/* scroll calculator */
	var scrollDistanceCalculator = function(options, containerInfo, mouseDragInfo) {
		var previousCurrentIndex = mouseDragInfo.previousCurrentIndex;
		if (previousCurrentIndex == null) {
			return 0;
		}
		var rowSize = containerInfo.rowInfoArray.length;
		var scrollToDirection = 0;
		/* starting */
		var mousePos = mouseDragInfo.mouseY;
		var previousMousePos = mouseDragInfo.previousMouseY;
		var containerBackPos = containerInfo.topPos;
		var containerFrontPos = containerInfo.bottomPos;
		if (options.isHorizontalMode) {
			mousePos = mouseDragInfo.mouseX;
			previousMousePos = mouseDragInfo.previousMouseX;
			containerBackPos = containerInfo.leftPos;
			containerFrontPos = containerInfo.rightPos;
		}
		if (mousePos < containerBackPos) {
			if (previousCurrentIndex > 0 && (previousMousePos < 0 || mousePos < previousMousePos)) {
				scrollToDirection = -1;
				mouseDragInfo.moveDistanceTotal += (containerBackPos - mousePos) / 5;
			}
		} else if (mousePos > containerFrontPos) {
			if (previousCurrentIndex < rowSize - 1 && (previousMousePos < 0 || mousePos > previousMousePos)) {
				scrollToDirection = 1;
				mouseDragInfo.moveDistanceTotal += (mousePos - containerFrontPos) / 5;
			}
		}
		return (scrollToDirection != 0 ? scrollToDirection * options.scrollSpeed / 20 * mouseDragInfo.moveDistanceTotal : 0);
	};

	/* default options */
	var defaultOptions = {
		maxLimit : -1,
		scrollSpeed : 20,
		isHorizontalMode : false,
		isTouchDeviceMode : PLUGIN_MODE_AUTO,
		isMouseEventEnabled : true,
		isKeyEventEnabled : true,
		/* form options */
		submitField : null,
		/* callback function */
		onCreate : null,
		onSelectStart : null,
		onSelectEnd : null,
		onSelectChange : null,
		/* others */
		scrollDistanceCalculator : scrollDistanceCalculator
	};

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
			/* starting */
			return this.each(function() {
				var $container = $(this);
				/* destroy */
				$container.destroyMultipleSelectBox();
				/* prepare className */
				$container.addClass(PLUGIN_NAMESPACE).addClass(options.isHorizontalMode ? PLUGIN_STYLE_HORIZONTAL : PLUGIN_STYLE_VERTICAL);
				/* prepare options */
				$container.data("options", options);
				/* disable text selection and give the focus */
				$container.css({
					userSelect : "none",
					KhtmlUserSelect : "none",
					MozUserSelect : "none",
					WebkitUserSelect : "none"
				}).attr({
					unselectable : "on",
					tabindex : 0
				}).bind("selectstart", function(e) {
					e.preventDefault();
					return false;
				});
				/* touch scroll supported for ios5+ only */
				/* $container.css("-webkit-overflow-scrolling", "touch"); */
				/* recalculate */
				$container.recalculateMultipleSelectBox();
				/* initialize */
				initializeMultipleSelectBox($container, options);
				/* callback function, for external trigger only */
				if (options.onCreate) {
					$container.bind("onCreate", options.onCreate);
				}
				if (options.onSelectStart) {
					$container.bind("onSelectStart", options.onSelectStart);
				}
				if (options.onSelectEnd) {
					$container.bind("onSelectEnd", options.onSelectEnd);
				}
				if (options.onSelectChange) {
					$container.bind("onSelectChange", options.onSelectChange);
				}
				/* correct options */
				if (options.submitField && typeof options.submitField === "string") {
					var $submitField = $("input[name=" + options.submitField + "]");
					options.submitField = ($submitField.length > 0 ? $submitField : $("<input type='hidden' name='" + options.submitField + "' />").insertAfter($container));
				}
				/* trigger event */
				if (options.onCreate) {
					options.onCreate.apply($container[0]);
				}
			});
		},

		/**
		 * Public : Get container's cached rows
		 * 
		 * @param isReNew
		 *            boolean
		 * @param selector
		 *            String
		 * @return jQuery
		 */
		getMultipleSelectBoxCachedRows : function(isReNew, selector) {
			return this.pushStack($.map(this, function(container) {
				var $container = $(container);
				var $rows = $container.data("rows");
				if (isReNew || !$rows) {
					/* cache rows if necessary */
					$rows = $container.children();
					$container.data("rows", $rows);
				}
				if (selector) {
					$rows = $rows.filter(selector);
				}
				return $rows.get();
			}));
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
				if (selector) {
					resultArray = $optGroupRow.pushStack(resultArray).filter(selector).get();
				}
				return resultArray;
			}));
		},

		/**
		 * Public : Get row's index
		 * 
		 * @return Number
		 */
		getMultipleSelectBoxRowIndex : function() {
			return this.data("index");
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
		 * Public : Get container's info
		 * 
		 * @return Object
		 */
		getMultipleSelectBoxInfo : function() {
			return this.data("info");
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
				isGetPositionByCache : false,
				isSelectionOpposite : false,
				isSelectionRetained : false,
				scrollPos : -1
			}, drawOption);
			return this.each(function() {
				var $container = $(this);
				var $rows = $container.getMultipleSelectBoxCachedRows();
				var options = $container.getMultipleSelectBoxOptions();
				/* recalculate position or not */
				if (!drawOption.isGetPositionByCache) {
					$container.recalculateMultipleSelectBox(true, true);
				}
				var containerInfo = $container.getMultipleSelectBoxInfo();
				var rowSize = containerInfo.rowInfoArray.length;
				/* remove invalid or duplicated request */
				if (startIndex < 0 || currentIndex < 0 || startIndex >= rowSize || currentIndex >= rowSize || options.maxLimit == 0 || !$rows.eq(startIndex).isMultipleSelectBoxRowSelectable()) {
					return this;
				}
				var minIndex = Math.min(startIndex, currentIndex);
				var maxIndex = Math.max(startIndex, currentIndex);
				/* prepare unselected or selecting array */
				var unselectedArray = [];
				var selectingArray = [];
				var selectedCount = 0;
				$rows.each(function(index) {
					var $childRow = $(this);
					$childRow.removeClass(PLUGIN_STYLE_SELECTING);
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
						} else {
							if (isRowSelected) {
								if (drawOption.isSelectionRetained) {
									selectedCount++;
								} else {
									unselectedArray.push($childRow);
								}
							}
						}
					}
				});
				var selectingArraySize = selectingArray.length;
				/* calculate max limit */
				if (options.maxLimit > 0 && (selectingArraySize + selectedCount) > options.maxLimit) {
					return this;
				}
				/* reset all style if necessary */
				$rows.eq(currentIndex).addClass(PLUGIN_STYLE_SELECTING);
				for ( var i = 0, unselectedArraySize = unselectedArray.length; i < unselectedArraySize; i++) {
					unselectedArray[i].removeClass(PLUGIN_STYLE_SELECTED);
				}
				for ( var i = 0; i < selectingArraySize; i++) {
					selectingArray[i].addClass(PLUGIN_STYLE_SELECTED);
				}
				/* reset scroll bar */
				var scrollPos = drawOption.scrollPos;
				if (scrollPos != null) {
					var isHorizontalMode = options.isHorizontalMode;
					if (scrollPos < 0) {
						scrollPos = calculateScrollPositionByCurrentIndex($container, containerInfo, isHorizontalMode, startIndex, currentIndex, null);
					}
					if (scrollPos != null && scrollPos >= 0) {
						if (isHorizontalMode) {
							$container.scrollLeft(scrollPos);
						} else {
							$container.scrollTop(scrollPos);
						}
					}
				}
				/* reset history */
				containerInfo.lastStartIndex = startIndex;
				containerInfo.lastCurrentIndex = currentIndex;
				return this;
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
				var resultValue = ($childRow.is("[" + PLUGIN_VALUE_RENDER_ATTR + "]") ? row.getAttribute(PLUGIN_VALUE_RENDER_ATTR) : $childRow.text());
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
			$(document).unbind("mouseleave." + PLUGIN_NAMESPACE).unbind("mousemove." + PLUGIN_NAMESPACE);
			return this.unbind("mouseenter").unbind("mouseleave").unbind("mouseover").unbind("touchmove");
		},

		/**
		 * Public : Destroy MultipleSelectBox
		 * 
		 * @return jQuery
		 */
		destroyMultipleSelectBox : function() {
			/* don't unbind the document's mouseup event */
			/* yield event handler */
			return this.yieldMultipleSelectBox().each(function() {
				var $container = $(this);
				/* reset event handler */
				$container.unbind("selectstart").unbind("mousedown").unbind("keydown").unbind("touchstart").unbind("onCreate").unbind("onSelectStart").unbind("onSelectEnd").unbind("onSelectChange");
				/* clear cache */
				$container.getMultipleSelectBoxCachedRows().unbind("dblclick").removeData("index");
				$container.removeData("info").removeData("rows").removeData("options");
			});
		},

		/**
		 * Public : Recalculate cached info
		 * 
		 * @param isResetContainerInfo
		 *            boolean
		 * @param isResetRowsInfo
		 *            boolean
		 * @param isResetHistory
		 *            boolean
		 * @param isResetRowCache
		 *            boolean
		 * @return jQuery
		 */
		recalculateMultipleSelectBox : function(isResetContainerInfo, isResetRowsInfo, isResetHistory, isResetRowCache) {
			return this.each(function() {
				var $container = $(this);
				var $rows = $container.getMultipleSelectBoxCachedRows(isResetRowCache);
				var containerInfo = $container.getMultipleSelectBoxInfo();
				if (!containerInfo) {
					isResetContainerInfo = isResetRowsInfo = isResetHistory = true;
					containerInfo = {};
					/* the info data must existed */
					$container.data("info", containerInfo);
				}
				/* reset all row's position or data */
				if (isResetRowsInfo) {
					var rowInfoArray = [];
					var firstTopPos = -1;
					var firstLeftPost = -1;
					$rows.each(function(index) {
						var $childRow = $(this);
						var childRowOffset = $childRow.offset();
						var childRowTopPos = childRowOffset.top;
						var childRowLeftPos = childRowOffset.left;
						if (index == 0) {
							firstTopPos = childRowTopPos;
							firstLeftPost = childRowLeftPos;
						}
						childRowTopPos -= firstTopPos;
						childRowLeftPos -= firstLeftPost;

						$childRow.data("index", index);
						rowInfoArray.push({
							topPos : childRowTopPos,
							bottomPos : childRowTopPos + $childRow.outerHeight(),
							leftPos : childRowLeftPos,
							rightPos : childRowLeftPos + $childRow.outerWidth()
						});
					});
					containerInfo.rowInfoArray = rowInfoArray;
				}
				/* reset container's position or data */
				if (isResetContainerInfo) {
					var containerOffset = $container.offset();
					containerInfo.topPos = containerOffset.top;
					containerInfo.bottomPos = containerInfo.topPos + $container.outerHeight();
					containerInfo.height = $container.innerHeight();
					containerInfo.scrollHeight = this.scrollHeight;
					containerInfo.leftPos = containerOffset.left;
					containerInfo.rightPos = containerInfo.leftPos + $container.outerWidth();
					containerInfo.width = $container.innerWidth();
					containerInfo.scrollWidth = this.scrollWidth;
				}
				/* reset history data */
				if (isResetHistory) {
					containerInfo.lastStartIndex = containerInfo.lastCurrentIndex = containerInfo.prevStartIndex = containerInfo.prevCurrentIndex = -1;
					containerInfo.prevSelectedArray = null;
				}
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
		}
	});

	/**
	 * Private : Fire OnSelectStart Event
	 */
	function fireOnSelectStartEvent(e, $container, options, startIndex) {
		if (!options.onSelectStart) {
			return true;
		}
		var isSelectEnabled = options.onSelectStart.apply($container[0], [ e, startIndex ]);
		return (typeof isSelectEnabled != "boolean" || isSelectEnabled);
	}

	/**
	 * Private : Get Selected Row Index Array
	 */
	function getSelectedRowIndexArray($rows) {
		return $.map($rows, function(row) {
			return $(row).getMultipleSelectBoxRowIndex();
		});
	}

	/**
	 * Private : Get Previous Available Selectable Row Index
	 */
	function getPreviousAvailableSelectableRowIndex($rows, index) {
		var rowSize = $rows.length;
		index -= 1;
		if (index < 0 || index >= rowSize) {
			return -1;
		}
		if (!$rows.eq(index).isMultipleSelectBoxRowSelectable()) {
			return getPreviousAvailableSelectableRowIndex($rows, index);
		}
		return index;
	}

	/**
	 * Private : Get Next Available Selectable Row Index
	 */
	function getNextAvailableSelectableRowIndex($rows, index) {
		var rowSize = $rows.length;
		index += 1;
		if (index < 0 || index >= rowSize) {
			return -1;
		}
		if (!$rows.eq(index).isMultipleSelectBoxRowSelectable()) {
			return getNextAvailableSelectableRowIndex($rows, index);
		}
		return index;
	}

	/**
	 * Private : Calculate Mouse Dragging To Current Index
	 */
	function calculateMouseDraggingToCurrentIndex(options, containerInfo, mouseDragInfo) {
		var previousCurrentIndex = mouseDragInfo.previousCurrentIndex;
		var scrollDistance = options.scrollDistanceCalculator(options, containerInfo, mouseDragInfo);
		if (scrollDistance == 0 || previousCurrentIndex == null) {
			return -1;
		}
		var rowSize = containerInfo.rowInfoArray.length;
		var currentIndex = -1;
		/* starting */
		var isHorizontalMode = options.isHorizontalMode;
		var containerMaxRange = containerInfo.scrollHeight;
		var targetRow = containerInfo.rowInfoArray[previousCurrentIndex];
		var targetPos = targetRow.topPos;
		if (isHorizontalMode) {
			containerMaxRange = containerInfo.scrollWidth;
			targetPos = targetRow.leftPos;
		}
		targetPos += scrollDistance;
		if (scrollDistance < 0) {
			if (targetPos > 0) {
				for ( var i = previousCurrentIndex - 1; i >= 0; i--) {
					var childRow = containerInfo.rowInfoArray[i];
					if (targetPos >= (isHorizontalMode ? childRow.leftPos : childRow.topPos)) {
						break;
					}
					currentIndex = i;
				}
			} else {
				currentIndex = 0;
			}
		} else {
			if (targetPos < containerMaxRange) {
				for ( var i = previousCurrentIndex + 1; i < rowSize; i++) {
					var childRow = containerInfo.rowInfoArray[i];
					if (targetPos < (isHorizontalMode ? childRow.rightPos : childRow.bottomPos)) {
						break;
					}
					currentIndex = i;
				}
			} else {
				currentIndex = rowSize - 1;
			}
		}
		/* reset */
		if (currentIndex >= 0) {
			mouseDragInfo.moveDistanceTotal = 0;
		}
		return currentIndex;
	}

	/**
	 * Private : Calculate Scroll Position By Current Index
	 */
	function calculateScrollPositionByCurrentIndex($container, containerInfo, isHorizontalMode, startIndex, currentIndex, mouseDragInfo) {
		var rowSize = containerInfo.rowInfoArray.length;
		var currentRow = containerInfo.rowInfoArray[currentIndex];
		if (startIndex < 0 || currentIndex < 0 || startIndex >= rowSize || currentIndex >= rowSize || currentRow == null) {
			return null;
		}
		var lastCurrentIndex = containerInfo.lastCurrentIndex;
		var scrollPos = null;
		/* starting */
		var mousePos = (mouseDragInfo != null ? mouseDragInfo.mouseY : null);
		var containerScrollPos = $container[0].scrollTop;
		var containerVisibleRange = containerInfo.height;
		var currentRowBackPos = currentRow.topPos;
		var currentRowFrontPos = currentRow.bottomPos;
		if (isHorizontalMode) {
			mousePos = (mouseDragInfo != null ? mouseDragInfo.mouseX : null);
			containerScrollPos = $container[0].scrollLeft;
			containerVisibleRange = containerInfo.width;
			currentRowBackPos = currentRow.leftPos;
			currentRowFrontPos = currentRow.rightPos;
		}
		if (mousePos == null) {
			if (startIndex < currentIndex || (startIndex == currentIndex && lastCurrentIndex >= 0 && lastCurrentIndex < currentIndex)) {
				if (currentRowFrontPos < containerScrollPos || currentRowFrontPos - containerVisibleRange > containerScrollPos) {
					scrollPos = currentRowFrontPos - containerVisibleRange;
				}
			} else if (startIndex > currentIndex || (startIndex == currentIndex && (lastCurrentIndex < 0 || lastCurrentIndex > currentIndex))) {
				if (currentRowBackPos < containerScrollPos || currentRowBackPos + containerVisibleRange < containerScrollPos) {
					scrollPos = currentRowBackPos;
				}
			}
		} else if (mousePos < containerInfo.topPos) {
			scrollPos = currentRowBackPos;
		} else if (mousePos > containerInfo.bottomPos) {
			scrollPos = currentRowFrontPos - containerVisibleRange;
		}
		return scrollPos;
	}

	/**
	 * Private : Initialize MultipleSelectBox MouseEvent
	 */
	function initializeMultipleSelectBoxMouseEvent($container, options, $rows, containerInfo) {
		var $document = $(document);
		/* process container event */
		$container.bind("mousedown", function(e) {
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
			var startIndex = $startRow.getMultipleSelectBoxRowIndex();
			var currentIndex = startIndex;
			/* trigger callback */
			if (!fireOnSelectStartEvent(e, $container, options, startIndex)) {
				return;
			}
			/* recalculate container and all row's position */
			$container.recalculateMultipleSelectBox(true, true);
			/* prepare info for drawing */
			/* opposite and retain selection for touch device */
			var isSelectionOpposite = isTouchDevice;
			var isSelectionRetained = isTouchDevice;
			if (options.isKeyEventEnabled) {
				if (e.shiftKey) {
					currentIndex = startIndex;
					startIndex = containerInfo.lastStartIndex;
				} else if (e.ctrlKey) {
					isSelectionOpposite = isSelectionRetained = true;
				}
			}
			/* starting */
			$container.addClass(PLUGIN_STYLE_SELECTING).drawMultipleSelectBox(startIndex, currentIndex, {
				isGetPositionByCache : true,
				isSelectionOpposite : isSelectionOpposite,
				isSelectionRetained : isSelectionRetained,
				scrollPos : null
			});
			/* listening */
			$container.yieldMultipleSelectBox().bind("mouseenter", function() {
				$document.unbind("mousemove." + PLUGIN_NAMESPACE);
			}).bind("mouseleave", function() {
				if (options.scrollSpeed <= 0) {
					return;
				}
				var mouseDragInfo = {
					mouseX : -1,
					mouseY : -1,
					moveDistanceTotal : 0,
					previousCurrentIndex : currentIndex,
					previousMouseX : -1,
					previousMouseY : -1
				};
				$document.bind("mousemove." + PLUGIN_NAMESPACE, function(e1) {
					mouseDragInfo.mouseX = e1.pageX;
					mouseDragInfo.mouseY = e1.pageY;
					currentIndex = calculateMouseDraggingToCurrentIndex(options, containerInfo, mouseDragInfo);
					if (currentIndex >= 0) {
						$container.drawMultipleSelectBox(startIndex, currentIndex, {
							isGetPositionByCache : true,
							isSelectionRetained : isSelectionRetained,
							scrollPos : calculateScrollPositionByCurrentIndex($container, containerInfo, options.isHorizontalMode, startIndex, currentIndex, mouseDragInfo)
						});
						mouseDragInfo.previousCurrentIndex = currentIndex;
					}
					mouseDragInfo.previousMouseX = mouseDragInfo.mouseX;
					mouseDragInfo.previousMouseY = mouseDragInfo.mouseY;
				});
			}).bind("mouseover", function(e1) {
				var $childTarget = $(e1.target);
				if (this == $childTarget.parent()[0]) {
					currentIndex = $childTarget.getMultipleSelectBoxRowIndex();
					$container.drawMultipleSelectBox(startIndex, currentIndex, {
						isGetPositionByCache : true,
						isSelectionRetained : isSelectionRetained,
						scrollPos : null
					});
				}
			});
			/* IE hacked for mouse event */
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
		$rows.filter("." + PLUGIN_STYLE_OPTGROUP).bind("dblclick", function(e) {
			var $startRow = $(this);
			/* trigger callback */
			if (!fireOnSelectStartEvent(e, $container, options, $startRow.getMultipleSelectBoxRowIndex())) {
				return;
			}
			var childGroupItemList = $startRow.getMultipleSelectBoxOptGroupItems();
			var childGroupItemSelectSize = childGroupItemList.length;
			if (childGroupItemSelectSize > 0) {
				if (options.maxLimit > 0 && childGroupItemSelectSize > options.maxLimit) {
					childGroupItemSelectSize = options.maxLimit;
				}
				$container.drawMultipleSelectBox(childGroupItemList.eq(0).getMultipleSelectBoxRowIndex(), childGroupItemList.eq(childGroupItemSelectSize - 1).getMultipleSelectBoxRowIndex(), {
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
	function initializeMultipleSelectBoxKeyEvent($container, options, $rows, containerInfo) {
		$container.bind("keydown", function(e) {
			if (e.target != this) {
				return;
			}
			var keyCode = e.keyCode;
			if ((keyCode >= 37 && keyCode <= 40) || keyCode == 32) {
				var currentIndex = containerInfo.lastCurrentIndex;
				/* prepare info for drawing */
				var isSelectionOpposite = false;
				var isSelectionRetained = e.shiftKey;
				if (keyCode == 37 || keyCode == 38) {
					/* left or up */
					currentIndex = getPreviousAvailableSelectableRowIndex($rows, currentIndex);
				} else if (keyCode == 39 || keyCode == 40) {
					/* right or down */
					currentIndex = getNextAvailableSelectableRowIndex($rows, currentIndex);
				} else if (keyCode == 32) {
					/* white space */
					isSelectionOpposite = true;
				}
				/* trigger callback */
				if (!fireOnSelectStartEvent(e, $container, options, currentIndex)) {
					return;
				}
				/* recalculate container and all row's position */
				$container.recalculateMultipleSelectBox(true, true);
				/* starting */
				$container.addClass(PLUGIN_STYLE_SELECTING).drawMultipleSelectBox(currentIndex, currentIndex, {
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
	function initializeMultipleSelectBoxTouchEvent($container, isHorizontalMode) {
		$container.bind("touchstart", function(e) {
			var startTouches = e.originalEvent.touches[0];
			var startTouchPos = startTouches.pageY;
			var startContainerScrollPos = this.scrollTop;
			if (isHorizontalMode) {
				startTouchPos = startTouches.pageX;
				startContainerScrollPos = this.scrollLeft;
			}
			$container.yieldMultipleSelectBox().bind("touchmove", function(e1) {
				/* disable touch scroll */
				e1.preventDefault();
				/* calculate scroll to position */
				var thisTouches = e1.originalEvent.touches[0];
				if (isHorizontalMode) {
					$container.scrollLeft(startContainerScrollPos + (thisTouches.pageX - startTouchPos));
				} else {
					$container.scrollTop(startContainerScrollPos + (thisTouches.pageY - startTouchPos));
				}
			});
		});
	}

	/**
	 * Private : Initialize MultipleSelectBox
	 */
	function initializeMultipleSelectBox($container, options) {
		var $rows = $container.getMultipleSelectBoxCachedRows();
		var containerInfo = $container.getMultipleSelectBoxInfo();
		/* mouse event */
		if (options.isMouseEventEnabled) {
			initializeMultipleSelectBoxMouseEvent($container, options, $rows, containerInfo);
		}
		/* key event */
		if (options.isKeyEventEnabled) {
			initializeMultipleSelectBoxKeyEvent($container, options, $rows, containerInfo);
		}
		/* touch event */
		if (isTouchDevice) {
			initializeMultipleSelectBoxTouchEvent($container, options.isHorizontalMode);
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
			var containerInfo = $container.getMultipleSelectBoxInfo();
			/* trigger callback */
			if ($container.isMultipleSelectBoxSelecting()) {
				/* reset style */
				$container.removeClass(PLUGIN_STYLE_SELECTING);
				var options = $container.getMultipleSelectBoxOptions();
				var selectedArray = $container.getMultipleSelectBoxSelectedRows();
				if (options.onSelectEnd) {
					options.onSelectEnd.apply($container[0], [ e, selectedArray, containerInfo.lastStartIndex, containerInfo.lastCurrentIndex, containerInfo.prevStartIndex, containerInfo.prevCurrentIndex ]);
				}
				if (options.onSelectChange && (containerInfo.prevSelectedArray == null || getSelectedRowIndexArray(containerInfo.prevSelectedArray).join() != getSelectedRowIndexArray(selectedArray).join())) {
					options.onSelectChange.apply($container[0], [ e, selectedArray, containerInfo.prevSelectedArray, containerInfo.lastStartIndex, containerInfo.lastCurrentIndex, containerInfo.prevStartIndex, containerInfo.prevCurrentIndex ]);
				}
				/* reset the field value */
				if (options.submitField) {
					options.submitField.val($container.serializeMultipleSelectBox());
				}
				containerInfo.prevSelectedArray = selectedArray;
			}
			/* reset history */
			containerInfo.prevStartIndex = containerInfo.lastStartIndex;
			containerInfo.prevCurrentIndex = containerInfo.lastCurrentIndex;
		});
	}

	/**
	 * Global Event Control
	 */
	$(document).bind("mouseup." + PLUGIN_NAMESPACE, function(e) {
		validateMultipleSelectBox(e);
	});
})(jQuery);