'use strict';

const MAX_NAME_LEN = 200;
const DEFAULT_TIERS = ['Godly','Z+','Z','S','A','B','C','D','E'];
const TIER_COLORS = [
	// from S to F
	'#00d9ff',
	'#00d9ff',
	'#00d9ff',
	'#f0a731',
	'#f4d95b',
	'#66ff66',
	'#58c8f4',
	'#5b76f4',
	'#f45bed'
];

let unique_id = 0;

let unsaved_changes = false;

let currentDroppable = null;

// Contains [[header, input, label]]
let all_headers = [];
let headers_orig_min_width;

// DOM elems
let untiered_images;
let tierlist_div;
let dragged_image;

function reset_row(row) {
	row.querySelectorAll('span.item').forEach((item) => {
		for (let i = 0; i < item.children.length; ++i) {
			let img = item.children[i];
			item.removeChild(img);
			untiered_images.appendChild(img);
		}
		item.parentNode.removeChild(item);
	});
}

// Removes all rows from the tierlist, alongside their content.
// Also empties the untiered images.
function hard_reset_list() {
	tierlist_div.innerHTML = '';
	untiered_images.innerHTML = '';
}

// Places back all the tierlist content into the untiered pool.
function soft_reset_list() {
	tierlist_div.querySelectorAll('.row').forEach(reset_row);
	unsaved_changes = true;
}

window.addEventListener('load', () => {
	loadImagesFromJson();
	
	untiered_images =  document.querySelector('.images');
	tierlist_div =  document.querySelector('.tierlist');

	for (let i = 0; i < DEFAULT_TIERS.length; ++i) {
		add_row(i, DEFAULT_TIERS[i]);
	}
	recompute_header_colors();

	headers_orig_min_width = all_headers[0][0].clientWidth;

	make_accept_drop(document.querySelector('.images'));
    tierlist_div.querySelectorAll('.row').forEach(row => make_accept_drop(row));

	bind_title_events();

	document.getElementById('load-img-input').addEventListener('input', (evt) => {
		// @Speed: maybe we can do some async stuff to optimize this
		let images = document.querySelector('.images');
		for (let file of evt.target.files) {
			let reader = new FileReader();
			reader.addEventListener('load', (load_evt) => {
				let img = create_img_with_src(load_evt.target.result);
				images.appendChild(img);
				unsaved_changes = true;
			});
			reader.readAsDataURL(file);
		}
	});

	// Allow copy-pasting image from clipboard
	document.onpaste = (evt) => {
		let clip_data = evt.clipboardData || evt.originalEvent.clipboardData;
		let items = clip_data.items;
		let images = document.querySelector('.images');
		for (let item of items) {
			if (item.kind === 'file') {
				let blob = item.getAsFile();
				let reader = new FileReader();
				reader.onload = (load_evt) => {
					let img = create_img_with_src(load_evt.target.result);
					images.appendChild(img);
					unsaved_changes = true;
				};
				reader.readAsDataURL(blob);
			}
		}
	};

	document.getElementById('reset-list-input').addEventListener('click', () => {
		if (confirm('Reset Tierlist? (this will place all images back in the pool)')) {
			soft_reset_list();
		}
	});

	document.getElementById('export-input').addEventListener('click', () => {
		let name = prompt('Please give a name to this tierlist');
		if (name) {
			save_tierlist(`${name}.json`);
		}
	});

	document.getElementById('import-input').addEventListener('input', (evt) => {
		if (!evt.target.files) {
			return;
		}
		let file = evt.target.files[0];
		let reader = new FileReader();
		reader.addEventListener('load', (load_evt) => {
			let raw = load_evt.target.result;
			let parsed = JSON.parse(raw);
			if (!parsed) {
				alert("Failed to parse data");
				return;
			}
			hard_reset_list();
			load_tierlist(parsed);
		});
		reader.readAsText(file);
	});

	bind_trash_events();

	window.addEventListener('beforeunload', (evt) => {
		if (!unsaved_changes) return null;
		var msg = "You have unsaved changes. Leave anyway?";
		(evt || window.event).returnValue = msg;
		return msg;
	});

	implementEfficientScrolling();
	setTimeout(implementEfficientScrolling, 100); // Small delay to ensure images are loaded
});

function create_img_with_src(src) {
    let container = document.createElement('div');
    container.style.width = '100px';
    container.style.height = '100px';
    container.style.backgroundImage = `url('${src}')`;
    container.style.backgroundSize = 'cover';
    container.style.backgroundPosition = 'center';
    container.classList.add('draggable', 'resizable-image');
    container.draggable = true;

    let item = document.createElement('span');
    item.classList.add('item');
    item.appendChild(container);

    return item;
}

function save(filename, text) {
	unsaved_changes = false;

	var el = document.createElement('a');
	el.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(text));
	el.setAttribute('download', filename);
	el.style.display = 'none';
	document.body.appendChild(el);
	el.click();
	document.body.removeChild(el);
}

function save_tierlist(filename) {
	let serialized_tierlist = {
		title: document.querySelector('.title-label').innerText,
		rows: [],
	};
	tierlist_div.querySelectorAll('.row').forEach((row, i) => {
		serialized_tierlist.rows.push({
			name: row.querySelector('.header label').innerText.substr(0, MAX_NAME_LEN)
		});
		serialized_tierlist.rows[i].imgs = [];
		row.querySelectorAll('img').forEach((img) => {
			serialized_tierlist.rows[i].imgs.push(img.src);
		});
	});

	let untiered_imgs = document.querySelectorAll('.images img');
	if (untiered_imgs.length > 0) {
		serialized_tierlist.untiered = [];
		untiered_imgs.forEach((img) => {
			serialized_tierlist.untiered.push(img.src);
		});
	}

	save(filename, JSON.stringify(serialized_tierlist));
}

function load_tierlist(serialized_tierlist) {
	document.querySelector('.title-label').innerText = serialized_tierlist.title;
	for (let idx in serialized_tierlist.rows) {
		let ser_row = serialized_tierlist.rows[idx];
		let elem = add_row(idx, ser_row.name);

		for (let img_src of ser_row.imgs ?? []) {
			let img = create_img_with_src(img_src);
			let td = document.createElement('span');
			td.classList.add('item');
			td.appendChild(img);
			let items_container = elem.querySelector('.items');
			items_container.appendChild(td);
		}

		elem.querySelector('label').innerText = ser_row.name;
	}
	recompute_header_colors();

	if (serialized_tierlist.untiered) {
		let images = document.querySelector('.images');
		for (let img_src of serialized_tierlist.untiered) {
			let img = create_img_with_src(img_src);
			images.appendChild(img);
		}
	}

	resize_headers();

	unsaved_changes = false;
}

function end_drag(evt) {
	dragged_image?.classList.remove("dragged");
	dragged_image = null;
}

window.addEventListener('mouseup', end_drag);
window.addEventListener('dragend', end_drag);

function enable_edit_on_click(container, input, label) {
	function change_label(evt) {
		input.style.display = 'none';
		label.innerText = input.value;
		label.style.display = 'inline';
		unsaved_changes = true;
	}

	input.addEventListener('change', change_label);
	input.addEventListener('focusout', change_label);

	container.addEventListener('click', (evt) => {
		label.style.display = 'none';
		input.value = label.innerText.substr(0, MAX_NAME_LEN);
		input.style.display = 'inline';
		input.select();
	});
}

function bind_title_events() {
	let title_label = document.querySelector('.title-label');
	let title_input = document.getElementById('title-input');
	let title = document.querySelector('.title');

	enable_edit_on_click(title, title_input, title_label);
}

function create_label_input(row, row_idx, row_name) {
	let input = document.createElement('input');
	input.id = `input-tier-${unique_id++}`;
	input.type = 'text';
	input.addEventListener('change', resize_headers);
	let label = document.createElement('label');
	label.htmlFor = input.id;
	label.innerText = row_name;

	let header = row.querySelector('.header');
	all_headers.splice(row_idx, 0, [header, input, label]);
	header.appendChild(label);
	header.appendChild(input);

	enable_edit_on_click(header, input, label);
}

function resize_headers() {
	let max_width = headers_orig_min_width;
	for (let [other_header, _i, label] of all_headers) {
		max_width = Math.max(max_width, label.clientWidth);
	}

	for (let [other_header, _i2, _l2] of all_headers) {
		other_header.style.minWidth = `${max_width}px`;
	}
}

function add_row(index, name) {
	let div = document.createElement('div');
	let header = document.createElement('span');
	let items = document.createElement('span');
	div.classList.add('row');
	header.classList.add('header');
	items.classList.add('items');
	div.appendChild(header);
	div.appendChild(items);
	let row_buttons = document.createElement('div');
	row_buttons.classList.add('row-buttons');
	let btn_plus_up = document.createElement('input');
	btn_plus_up.type = "button";
	btn_plus_up.value = '+';
	btn_plus_up.title = "Add row above";
	btn_plus_up.addEventListener('click', (evt) => {
		let parent_div = evt.target.parentNode.parentNode;
		let rows = Array.from(tierlist_div.children);
		let idx = rows.indexOf(parent_div);
		console.assert(idx >= 0);
		add_row(idx, '');
		recompute_header_colors();
	});
	let btn_rm = document.createElement('input');
	btn_rm.type = "button";
	btn_rm.value = '-';
	btn_rm.title = "Remove row";
	btn_rm.addEventListener('click', (evt) => {
		let rows = Array.from(tierlist_div.querySelectorAll('.row'));
		if (rows.length < 2) return;
		let parent_div = evt.target.parentNode.parentNode;
		let idx = rows.indexOf(parent_div);
		console.assert(idx >= 0);
		if (rows[idx].querySelectorAll('img').length === 0 ||
			confirm(`Remove tier ${rows[idx].querySelector('.header label').innerText}? (This will move back all its content to the untiered pool)`))
		{
			rm_row(idx);
		}
		recompute_header_colors();
	});
	let btn_plus_down = document.createElement('input');
	btn_plus_down.type = "button";
	btn_plus_down.value = '+';
	btn_plus_down.title = "Add row below";
	btn_plus_down.addEventListener('click', (evt) => {
		let parent_div = evt.target.parentNode.parentNode;
		let rows = Array.from(tierlist_div.children);
		let idx = rows.indexOf(parent_div);
		console.assert(idx >= 0);
		add_row(idx + 1, name);
		recompute_header_colors();
	});
	row_buttons.appendChild(btn_plus_up);
	row_buttons.appendChild(btn_rm);
	row_buttons.appendChild(btn_plus_down);
	div.appendChild(row_buttons);

	let rows = tierlist_div.children;
	if (index === rows.length) {
		tierlist_div.appendChild(div);
	} else {
		let nxt_child = rows[index];
		tierlist_div.insertBefore(div, nxt_child);
	}

	make_accept_drop(div);
	create_label_input(div, index, name);

	return div;
}

function rm_row(idx) {
	let row = tierlist_div.children[idx];
	reset_row(row);
	tierlist_div.removeChild(row);
}

function recompute_header_colors() {
	tierlist_div.querySelectorAll('.row').forEach((row, row_idx) => {
		let color = TIER_COLORS[row_idx % TIER_COLORS.length];
		row.querySelector('.header').style.backgroundColor = color;
	});
}

function bind_trash_events() {
	let trash = document.getElementById('trash');
	trash.classList.add('droppable');
	trash.addEventListener('dragenter', (evt) => {
		evt.preventDefault();
		evt.target.src = 'trash_bin_open.png';
	});
	trash.addEventListener('dragexit', (evt) => {
		evt.preventDefault();
		evt.target.src = 'trash_bin.png';
	});
	trash.addEventListener('dragover', (evt) => {
		evt.preventDefault();
	});
	trash.addEventListener('drop', (evt) => {
		evt.preventDefault();
		evt.target.src = 'trash_bin.png';
		if (dragged_image) {
			let dragged_image_parent = dragged_image.parentNode;
			if (dragged_image_parent.tagName.toUpperCase() === 'SPAN' &&
					dragged_image_parent.classList.contains('item'))
			{
				// We were already in a tier
				let containing_tr = dragged_image_parent.parentNode;
				containing_tr.removeChild(dragged_image_parent);
			}
			dragged_image.remove();
		}
	});
}

// Call this function after loading images
function loadImagesFromJson() {
    fetch('images.json')
        .then(response => response.json())
        .then(data => {
            const imagesContainer = document.querySelector('.images');
            data.images.forEach(imageData => {
                const img = create_img_with_src(imageData.path);
                img.dataset.rarity = imageData.rarity;
                img.dataset.cardNumber = imageData.cardNumber;
                imagesContainer.appendChild(img);
            });
            console.log(`Loaded ${data.images.length} images`);
            // Remove the call to implementEfficientScrolling here
        })
        .catch(error => console.error('Error loading images:', error));
}

let draggedItem = null;
let placeholder = null;

function createPlaceholder() {
    const ph = document.createElement('div');
    ph.classList.add('placeholder');
    ph.style.width = `${draggedItem.offsetWidth}px`;
    ph.style.height = `${draggedItem.offsetHeight}px`;
    return ph;
}

function updateDragPosition(e, container) {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const items = Array.from(container.querySelectorAll('.item:not(.dragged)'));
    let insertBefore = null;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemRect = item.getBoundingClientRect();
        const itemX = itemRect.left - rect.left;
        const itemY = itemRect.top - rect.top;
        
        if (y < itemY + itemRect.height / 2) {
            if (x < itemX + itemRect.width / 2) {
                insertBefore = item;
                break;
            }
        } else if (i === items.length - 1) {
            insertBefore = item.nextSibling;
            break;
        }
    }

    if (insertBefore !== placeholder.nextSibling) {
        container.insertBefore(placeholder, insertBefore);
    }
}

const throttledUpdateDragPosition = throttle((e, container) => {
    updateDragPosition(e, container);
}, 16); // Throttle to about 60fps

function make_accept_drop(elem) {
    elem.classList.add('droppable');

    elem.addEventListener('dragenter', (evt) => {
        evt.preventDefault();
        evt.target.classList.add('drag-entered');
        if (draggedItem && !placeholder) {
            placeholder = createPlaceholder();
        }
    });

    elem.addEventListener('dragleave', (evt) => {
        evt.preventDefault();
        evt.target.classList.remove('drag-entered');
        if (placeholder && !elem.contains(evt.relatedTarget)) {
            placeholder.remove();
            placeholder = null;
        }
    });

    elem.addEventListener('dragover', (evt) => {
        evt.preventDefault();
        if (draggedItem) {
            updateDragPosition(evt, elem.querySelector('.items') || elem);
        }
    });

	elem.addEventListener('drop', (evt) => {
        evt.preventDefault();
        evt.target.classList.remove('drag-entered');

        if (!draggedItem) return;

        let itemsContainer = elem.querySelector('.items') || elem;

        if (placeholder) {
            itemsContainer.insertBefore(draggedItem, placeholder);
            placeholder.remove();
            placeholder = null;
        } else {
            itemsContainer.appendChild(draggedItem);
        }

        draggedItem.classList.remove('dragged');
        draggedItem.style.position = '';
        draggedItem.style.zIndex = '';
        draggedItem.style.left = '';
        draggedItem.style.top = '';
        draggedItem = null;
        unsaved_changes = true;
    });
}

// Add new mousedown event listener for drag initiation
document.addEventListener('mousedown', (evt) => {
    if (evt.target.classList.contains('draggable') || evt.target.closest('.draggable')) {
        draggedItem = evt.target.closest('.item') || evt.target;
        draggedItem.classList.add('dragged');
        
        // Create and add placeholder
        placeholder = createPlaceholder();
        draggedItem.parentNode.insertBefore(placeholder, draggedItem.nextSibling);
        
        // Set initial position of dragged item
        draggedItem.style.position = 'absolute';
        draggedItem.style.zIndex = '1000';
        moveAt(evt.pageX, evt.pageY);
        
        // Move dragged element on mousemove
        function onMouseMove(e) {
			moveAt(e.pageX, e.pageY);
			draggedItem.hidden = true;
			let elemBelow = document.elementFromPoint(e.clientX, e.clientY);
			draggedItem.hidden = false;
			
			let droppableBelow = elemBelow?.closest('.droppable');
			if (droppableBelow) {
				let itemsContainer = droppableBelow.querySelector('.items') || droppableBelow;
				if (itemsContainer !== currentDroppable) {
					if (currentDroppable) {
						leaveDroppable(currentDroppable);
					}
					currentDroppable = itemsContainer;
					enterDroppable(currentDroppable);
				}
				throttledUpdateDragPosition(e, itemsContainer);
			} else if (currentDroppable) {
				leaveDroppable(currentDroppable);
				currentDroppable = null;
			}
		}
		
		function enterDroppable(elem) {
			elem.classList.add('drag-entered');
		}
		
		function leaveDroppable(elem) {
			elem.classList.remove('drag-entered');
		}

        // Move the dragged element to the cursor position
        function moveAt(pageX, pageY) {
            draggedItem.style.left = pageX - draggedItem.offsetWidth / 2 + 'px';
            draggedItem.style.top = pageY - draggedItem.offsetHeight / 2 + 'px';
        }

        document.addEventListener('mousemove', onMouseMove);

        // Remove listeners on mouseup
        draggedItem.onmouseup = function() {
            document.removeEventListener('mousemove', onMouseMove);
            draggedItem.onmouseup = null;
            if (placeholder && placeholder.parentNode) {
                placeholder.parentNode.insertBefore(draggedItem, placeholder);
                placeholder.remove();
            }
            draggedItem.classList.remove('dragged');
            draggedItem.style.position = '';
            draggedItem.style.zIndex = '';
            draggedItem.style.left = '';
            draggedItem.style.top = '';
            draggedItem = null;
            placeholder = null;
            unsaved_changes = true;
        };
    }
});

// Prevent default drag behavior for images
document.addEventListener('dragstart', (e) => {
    if (e.target.tagName.toLowerCase() === 'img') {
        e.preventDefault();
    }
});

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

function implementEfficientScrolling() {
    const imagesContainer = document.querySelector('.images');
    const itemHeight = 100; // Assuming each item is 100px tall
    const visibleItems = Math.ceil(imagesContainer.clientHeight / itemHeight);
    let allItems = Array.from(imagesContainer.children);
    let scrollTop = 0;

    function updateVisibleItems() {
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(startIndex + visibleItems * 3, allItems.length);

        for (let i = 0; i < allItems.length; i++) {
            if (i >= startIndex && i < endIndex) {
                allItems[i].style.display = '';
            } else {
                allItems[i].style.display = 'none';
            }
        }
    }

    imagesContainer.addEventListener('scroll', () => {
        scrollTop = imagesContainer.scrollTop;
        updateVisibleItems();
    });

    // Initial render
    updateVisibleItems();
}

function renderAllImages() {
    const imagesContainer = document.querySelector('.images');
    const allItems = Array.from(imagesContainer.children);
    imagesContainer.innerHTML = '';
    allItems.forEach(item => imagesContainer.appendChild(item));
}

function sortImagesByRarity() {
    const imagesContainer = document.querySelector('.images');
    const images = Array.from(imagesContainer.children);
    images.sort((a, b) => a.dataset.rarity.localeCompare(b.dataset.rarity));
    images.forEach(img => {
        imagesContainer.appendChild(img);
        img.style.display = ''; // Ensure all images are visible after sorting
    });
    implementEfficientScrolling(); // Re-implement efficient scrolling after sorting
}

function sortImagesByCardNumber() {
    const imagesContainer = document.querySelector('.images');
    const images = Array.from(imagesContainer.children);
    images.sort((a, b) => a.dataset.cardNumber.localeCompare(b.dataset.cardNumber));
    images.forEach(img => {
        imagesContainer.appendChild(img);
        img.style.display = ''; // Ensure all images are visible after sorting
    });
    implementEfficientScrolling(); // Re-implement efficient scrolling after sorting
}

function showAllImages() {
    const imagesContainer = document.querySelector('.images');
    const images = Array.from(imagesContainer.children);
    images.forEach(img => img.style.display = '');
}