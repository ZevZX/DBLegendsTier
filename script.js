const MAX_NAME_LEN = 200;
const DEFAULT_TIERS = [
    { name: '', icon: 'assets/equipmentswebp/GodlyRankEquip.webp', color: '#59dffa' },
    { name: '', icon: 'assets/equipmentswebp/ZplusRankEquip.webp', color: '#f979ad' },
    { name: '', icon: 'assets/equipmentswebp/ZRankEquip.webp', color: '#f8d423' },
    { name: '', icon: 'assets/equipmentswebp/SRankEquip.webp', color: '#d85cfb' },
    { name: '', icon: 'assets/equipmentswebp/ARankEquip.webp', color: '#7dc6f6' },
    { name: '', icon: 'assets/equipmentswebp/BRankEquip.webp', color: '#70d46c' },
    { name: '', icon: 'assets/equipmentswebp/CRankEquip.webp', color: '#c6d0b3' },
    { name: '', icon: 'assets/equipmentswebp/DRankEquip.webp', color: '#b4b49e' },
    { name: '', icon: 'assets/equipmentswebp/ERankEquip.webp', color: '#a5b3a3' },
    { name: '', icon: 'assets/equipmentswebp/FRankEquip.webp', color: '#788080' }
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

let draggedItem = null;
let placeholder = null;


function create_img_with_src(src) {
    let container = document.createElement('div');
    container.style.width = '50px';
    container.style.height = '50px';
    container.style.backgroundImage = `url('${src}')`;
    container.style.backgroundSize = 'cover';
    container.style.backgroundPosition = 'center';
    container.classList.add('draggable', 'resizable-image');
    container.draggable = true;
    // Add the full path as a data attribute
    container.setAttribute('data-path', src);

    let item = document.createElement('span');
    item.classList.add('item');
    item.appendChild(container);

    return item;
}

function end_drag(evt) {
    if (dragged_image) {
        dragged_image.classList.remove("dragged");
        dragged_image = null;
    }
}

function adjustRowHeight(row) {
    const header = row.querySelector('.header');
    const items = row.querySelector('.items');
    
    // Reset heights to auto to get the natural content height
    header.style.height = 'auto';
    items.style.height = 'auto';
    row.style.height = 'auto';
    
    // Calculate the number of items and rows
    const itemCount = items.children.length;
    const itemWidth = 50; // Assuming each item is 50px wide
    const itemHeight = 50; // Assuming each item is 50px tall
    const containerWidth = items.clientWidth;
    const itemsPerRow = Math.max(1, Math.floor(containerWidth / itemWidth));
    const rowsNeeded = Math.ceil(itemCount / itemsPerRow);
    
    // Calculate the new height (itemHeight per row, with a minimum of 1 row)
    const contentHeight = Math.max(1, rowsNeeded) * itemHeight;
    const headerHeight = header.scrollHeight;
    const newHeight = Math.max(headerHeight, contentHeight);
    
    row.style.height = `${newHeight}px`;
    header.style.height = `${newHeight}px`;
    items.style.height = `${newHeight}px`;
    
    // Remove the transitions after they're complete
    setTimeout(() => {
        row.style.transition = '';
        header.style.transition = '';
        items.style.transition = '';
    }, 300);
}

function adjustHeaderHeight(header) {
    const label = header.querySelector('label');
    const icon = header.querySelector('.tier-icon');
    const iconHeight = icon ? icon.offsetHeight : 0;
    const labelHeight = label.scrollHeight;
    header.style.height = `${Math.max(50, iconHeight + labelHeight + 10)}px`; // 10px for padding
    
    // Call adjustRowHeight for the entire row
    const row = header.closest('.row');
    adjustRowHeight(row);
}

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

	input.addEventListener('change', () => {
        adjustHeaderHeight(container);
    });
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

    // Adjust the header height based on the label content
    adjustHeaderHeight(header);
}

function observeItemChanges(row) {
    const items = row.querySelector('.items');
    const observer = new MutationObserver(() => {
        requestAnimationFrame(() => adjustRowHeight(row));
    });
    observer.observe(items, { childList: true, subtree: true });

    const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => adjustRowHeight(row));
    });
    resizeObserver.observe(items);
}

function resize_headers() {
    let max_width = headers_orig_min_width;
    for (let [other_header, _i, label] of all_headers) {
        max_width = Math.max(max_width, label.clientWidth);
    }

    for (let [other_header, _i2, _l2] of all_headers) {
        other_header.style.minWidth = `${max_width}px`;
        adjustRowHeight(other_header.closest('.row'));
    }
}

function createPlaceholder() {
    const ph = document.createElement('div');
    ph.classList.add('placeholder');
    ph.style.width = `${draggedItem.offsetWidth}px`;
    ph.style.height = `${draggedItem.offsetHeight}px`;
    ph.style.margin = window.getComputedStyle(draggedItem).margin;
    
    const clone = draggedItem.cloneNode(true);
    clone.classList.remove('dragged');
    
    ph.appendChild(clone);
    return ph;
}

function updateDragPosition(e, container) {
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const items = Array.from(container.querySelectorAll('.item:not(.dragged)'));
    let insertBefore = null;

    // Sort items by their vertical position first, then horizontal
    items.sort((a, b) => {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        if (Math.abs(rectA.top - rectB.top) < 5) { // If items are in the same row (with a small tolerance)
            return rectA.left - rectB.left;
        }
        return rectA.top - rectB.top;
    });

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemRect = item.getBoundingClientRect();
        const itemX = itemRect.left - rect.left;
        const itemY = itemRect.top - rect.top;

        if (mouseY < itemY + itemRect.height) {
            if (mouseX < itemX + itemRect.width / 2) {
                insertBefore = item;
                break;
            }
        }
    }

    if (!placeholder) {
        placeholder = createPlaceholder();
    }

    if (insertBefore) {
        if (placeholder !== insertBefore.previousSibling) {
            container.insertBefore(placeholder, insertBefore);
        }
    } else {
        container.appendChild(placeholder);
    }
}

function make_accept_drop(elem) {
    elem.classList.add('droppable');

    elem.addEventListener('dragover', (evt) => {
        evt.preventDefault();
        evt.target.closest('.droppable').classList.add('drag-entered');
        
        if (draggedItem) {
            const itemsContainer = elem.querySelector('.items') || elem;
            updateDragPosition(evt, itemsContainer);
        }
    });

    elem.addEventListener('dragleave', (evt) => {
        evt.preventDefault();
        if (!elem.contains(evt.relatedTarget)) {
            elem.classList.remove('drag-entered');
            if (placeholder && placeholder.parentNode === elem) {
                placeholder.remove();
            }
        }
    });

    elem.addEventListener('drop', (evt) => {
        evt.preventDefault();
        elem.classList.remove('drag-entered');
    
        if (!draggedItem) return;
    
        let itemsContainer = elem.querySelector('.items') || elem;
    
        if (placeholder && placeholder.parentNode === itemsContainer) {
            itemsContainer.insertBefore(draggedItem, placeholder);
        } else {
            itemsContainer.appendChild(draggedItem);
        }
    
        draggedItem.style.display = '';
        draggedItem.classList.remove('dragged');
    
        if (placeholder) {
            placeholder.remove();
        }
    
        requestAnimationFrame(() => {
            const sourceRow = draggedItem.closest('.row');
            const targetRow = elem.closest('.row');
            
            if (sourceRow) adjustRowHeight(sourceRow);
            if (targetRow) adjustRowHeight(targetRow);
            
            // Adjust the untiered images container if needed
            const untieredContainer = document.querySelector('.images');
            if (elem === untieredContainer || draggedItem.closest('.images') === untieredContainer) {
                adjustRowHeight(untieredContainer.closest('.row') || untieredContainer);
            }
        });
    
        draggedItem = null;
        placeholder = null;
        unsaved_changes = true;
    });
}

// Helper function to convert RGB to HEX
function rgbToHex(rgb) {
    if (!rgb) return '#000000';
    let [r, g, b] = rgb.match(/\d+/g);
    return "#" + ((1 << 24) + (parseInt(r) << 16) + (parseInt(g) << 8) + parseInt(b)).toString(16).slice(1);
}

function rm_row(idx) {
	let row = tierlist_div.children[idx];
	reset_row(row);
	tierlist_div.removeChild(row);
}

function add_row(index, tierData) {
    let div = document.createElement('div');
    let header = document.createElement('span');
    let items = document.createElement('span');
    div.classList.add('row');
    header.classList.add('header');
    items.classList.add('items');
    div.appendChild(header);
    div.appendChild(items);

    // Create icon element
    let icon = document.createElement('img');
    icon.src = tierData.icon || '';
    icon.classList.add('tier-icon');
    icon.style.display = tierData.icon ? 'inline-block' : 'none';
    header.appendChild(icon);

	let row_buttons = document.createElement('div');
    row_buttons.classList.add('row-buttons');

    let btn_change_attr = document.createElement('input');
    btn_change_attr.type = "button";
    btn_change_attr.value = '⚙️';
    btn_change_attr.title = "Change tier attributes";
    btn_change_attr.addEventListener('click', () => changeTierAttributes(div));
    row_buttons.appendChild(btn_change_attr);

    div.appendChild(row_buttons);

    let rows = tierlist_div.children;
    if (index === rows.length) {
        tierlist_div.appendChild(div);
    } else {
        let nxt_child = rows[index];
        tierlist_div.insertBefore(div, nxt_child);
    }

    make_accept_drop(div);
    create_label_input(div, index, tierData.name);

    // Set the background color
    header.style.backgroundColor = tierData.color;

    // Add the mutation observer
    observeItemChanges(div);
}

function showTierAttributesPopup(row) {
    let header = row.querySelector('.header');
    let icon = header.querySelector('.tier-icon');
    let label = header.querySelector('label');

    let popup = document.createElement('div');
    popup.classList.add('tier-attributes-popup');

    let content = `
        <h2>Edit Tier</h2>
        <label>
            Tier Color:
            <input type="color" id="tier-color" value="${rgbToHex(header.style.backgroundColor)}">
        </label>
        <label>
            Tier Icon:
            <div id="tier-icon-selection">
                ${DEFAULT_TIERS.map(tier => `
                    <div class="tier-icon-option${icon.src && icon.src.includes(tier.icon) ? ' selected' : ''}" data-icon="${tier.icon}">
                        <img src="${tier.icon}" alt="${tier.name}" title="${tier.name}">
                    </div>
                `).join('')}
                <div class="tier-icon-option${!icon.src || icon.style.display === 'none' ? ' selected' : ''}" data-icon="">
                    <span>No Icon</span>
                </div>
            </div>
        </label>
        <div class="row-management">
            <button id="add-row-above">Add Row Above</button>
            <button id="add-row-below">Add Row Below</button>
            <button id="remove-row">Remove Row</button>
        </div>
        <div class="popup-buttons">
            <button id="save-tier-attributes">Save</button>
            <button id="cancel-tier-attributes">Cancel</button>
        </div>
    `;

    popup.innerHTML = content;
    document.body.appendChild(popup);

    // Add event listeners for icon selection
    document.querySelectorAll('.tier-icon-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.tier-icon-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        });
    });

    document.getElementById('save-tier-attributes').addEventListener('click', () => {
        let newColor = document.getElementById('tier-color').value;
        let newIcon = document.querySelector('.tier-icon-option.selected').dataset.icon;

        if (newColor) header.style.backgroundColor = newColor;
        icon.src = newIcon;
        icon.style.display = newIcon ? 'inline-block' : 'none';

        unsaved_changes = true;
        document.body.removeChild(popup);
    });

    document.getElementById('cancel-tier-attributes').addEventListener('click', () => {
        document.body.removeChild(popup);
    });

    document.getElementById('add-row-above').addEventListener('click', () => {
        let newRow = add_row(Array.from(tierlist_div.children).indexOf(row), { name: 'NEW', color: '#fc3f32' });
        newRow.querySelector('.header').style.backgroundColor = '#fc3f32';
        document.body.removeChild(popup);
    });

    document.getElementById('remove-row').addEventListener('click', () => {
        let rows = Array.from(tierlist_div.querySelectorAll('.row'));
        if (rows.length < 2) return;
        let idx = rows.indexOf(row);
        if (rows[idx].querySelectorAll('img').length === 0 ||
            confirm(`Remove tier ${rows[idx].querySelector('.header label').innerText}? (This will move back all its content to the untiered pool)`))
        {
            rm_row(idx);
            document.body.removeChild(popup);
        }
    });

    document.getElementById('add-row-below').addEventListener('click', () => {
        let newRow = add_row(Array.from(tierlist_div.children).indexOf(row) + 1, { name: 'NEW', color: '#fc3f32' });
        newRow.querySelector('.header').style.backgroundColor = '#fc3f32';
        document.body.removeChild(popup);
    });
}

function changeTierAttributes(row) {
    showTierAttributesPopup(row);
}

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

function loadImagesFromJson() {
    fetch('characters.json')
        .then(response => response.json())
        .then(data => {
            const imagesContainer = document.querySelector('.images');
            data.forEach(character => {
                const img = create_img_with_src(character.image_url);
                img.querySelector('.draggable').dataset.rarity = character.rarity;
                img.querySelector('.draggable').dataset.cardNumber = character.id;
                img.querySelector('.draggable').setAttribute('data-path', character.image_url);
                img.querySelector('.draggable').dataset.name = character.name;
                img.querySelector('.draggable').dataset.color = character.color;
                img.querySelector('.draggable').dataset.tags = character.tags.join(',');
                imagesContainer.appendChild(img);
            });
            console.log(`Loaded ${data.length} characters`);
            
            // Adjust the untiered images container after loading
            adjustRowHeight(imagesContainer.closest('.row') || imagesContainer);

            // Set up the search feature after images are loaded
            setupSearchFeature();
        })
        .catch(error => console.error('Error loading characters:', error));
}

function setupSearchFeature() {
    const searchInput = document.getElementById('image-search');
    const imagesContainer = document.querySelector('.images');

    if (!searchInput || !imagesContainer) {
        console.error('Search input or images container not found');
        return;
    }

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const allItems = imagesContainer.querySelectorAll('.item');

        allItems.forEach(item => {
            const img = item.querySelector('.draggable');
            if (!img) return;
            
            const name = img.dataset.name.toLowerCase();
            const tags = img.dataset.tags.toLowerCase();
            const color = img.dataset.color.toLowerCase();
            const rarity = img.dataset.rarity.toLowerCase();

            if (name.includes(searchTerm) || tags.includes(searchTerm) || color.includes(searchTerm) || rarity.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });

        // Adjust the container height after filtering
        adjustRowHeight(imagesContainer.closest('.row') || imagesContainer);
    });
}

function importTierlist(file) {
    let reader = new FileReader();
    reader.onload = function(e) {
        let serializedTierlist = JSON.parse(e.target.result);
        
        // Clear current tierlist
        document.querySelector('.tierlist').innerHTML = '';
        document.querySelector('.images').innerHTML = '';

        // Recreate tiers
        serializedTierlist.tiers.forEach((tier, index) => {
            let row = add_row(index, {
                name: tier.name,
                icon: tier.icon,
                color: tier.color
            });
            
            tier.images.forEach(imgData => {
                let img = create_img_with_src(imgData.src);
                img.dataset.rarity = imgData.rarity;
                img.dataset.cardNumber = imgData.cardNumber;
                img.dataset.name = imgData.name;
                img.dataset.color = imgData.color;
                img.dataset.tags = imgData.tags.join(',');
                row.querySelector('.items').appendChild(img);
            });
        });

        // Recreate untiered images
        let untieredContainer = document.querySelector('.images');
        serializedTierlist.untieredImages.forEach(imgData => {
            let img = create_img_with_src(imgData.src);
            img.dataset.rarity = imgData.rarity;
            img.dataset.cardNumber = imgData.cardNumber;
            img.dataset.name = imgData.name;
            img.dataset.color = imgData.color;
            img.dataset.tags = imgData.tags.join(',');
            untieredContainer.appendChild(img);
        });
    };
    reader.readAsText(file);
}

function exportTierlist() {
    let fileName = prompt("Enter a name for your tierlist:", "my_tierlist");
    if (!fileName) return;

    let serializedTierlist = {
        tiers: [],
        untieredImages: []
    };

    // Serialize tiers
    document.querySelectorAll('.row').forEach(row => {
        let headerElement = row.querySelector('.header');
        let iconElement = headerElement.querySelector('.tier-icon');
        let tier = {
            name: headerElement.querySelector('label').innerText,
            color: headerElement.style.backgroundColor,
            icon: iconElement.src,
            images: []
        };

        row.querySelectorAll('.item').forEach(item => {
            let img = item.querySelector('div');
            tier.images.push({
                src: img.style.backgroundImage.slice(5, -2),
                rarity: img.dataset.rarity,
                cardNumber: img.dataset.cardNumber,
                name: img.dataset.name,
                color: img.dataset.color,
                tags: img.dataset.tags.split(',')
            });
        });

        serializedTierlist.tiers.push(tier);
    });

    // Serialize untiered images
    document.querySelectorAll('.images .item').forEach(item => {
        let img = item.querySelector('div');
        serializedTierlist.untieredImages.push({
            src: img.style.backgroundImage.slice(5, -2),
            rarity: img.dataset.rarity,
            cardNumber: img.dataset.cardNumber,
            name: img.dataset.name,
            color: img.dataset.color,
            tags: img.dataset.tags.split(',')
        });
    });

    // Save to file
    let blob = new Blob([JSON.stringify(serializedTierlist)], {type: 'application/json'});
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.json`;
    a.click();
}

window.addEventListener('load', () => {
    loadImagesFromJson();
    
    untiered_images = document.querySelector('.images');
    tierlist_div = document.querySelector('.tierlist');

    for (let i = 0; i < DEFAULT_TIERS.length; ++i) {
        add_row(i, DEFAULT_TIERS[i]);
    }

    headers_orig_min_width = all_headers[0][0].clientWidth;

    make_accept_drop(document.querySelector('.images'));

    setupSearchFeature();

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

	window.addEventListener('beforeunload', (evt) => {
		if (!unsaved_changes) return null;
		var msg = "You have unsaved changes. Leave anyway?";
		(evt || window.event).returnValue = msg;
		return msg;
	});

    window.addEventListener('resize', () => {
        document.querySelectorAll('.row').forEach(row => {
            adjustRowHeight(row);
        });
        adjustRowHeight(document.querySelector('.images').closest('.row') || document.querySelector('.images'));
    });
    
    document.querySelectorAll('.row').forEach(row => {
        adjustRowHeight(row);
        observeItemChanges(row);
    });

    // Adjust the untiered images container
    adjustRowHeight(document.querySelector('.images').closest('.row') || document.querySelector('.images'));
});

window.addEventListener('mouseup', end_drag);
window.addEventListener('dragend', end_drag);

window.addEventListener('resize', () => {
    document.querySelectorAll('.row').forEach(row => {
        adjustRowHeight(row);
    });
    adjustRowHeight(document.querySelector('.images').closest('.row') || document.querySelector('.images'));
});

document.addEventListener('dragstart', (evt) => {
    if (evt.target.classList.contains('draggable') || evt.target.closest('.draggable')) {
        draggedItem = evt.target.closest('.item') || evt.target;
        draggedItem.classList.add('dragged');
        evt.dataTransfer.setData('text/plain', '');
        evt.dataTransfer.effectAllowed = 'move';
        
        // Store the original position
        draggedItem.originalParent = draggedItem.parentNode;
        draggedItem.originalNextSibling = draggedItem.nextElementSibling;
        
        setTimeout(() => {
            placeholder = createPlaceholder();
            if (draggedItem.originalNextSibling) {
                draggedItem.originalParent.insertBefore(placeholder, draggedItem.originalNextSibling);
            } else {
                draggedItem.originalParent.appendChild(placeholder);
            }
            draggedItem.style.display = 'none';
        }, 0);
    }
});

document.addEventListener('dragend', (evt) => {
    if (draggedItem) {
        draggedItem.classList.remove('dragged');
        draggedItem.style.display = '';
        
        // Always return the item to its original position unless it was properly dropped
        if (!draggedItem.parentNode || !draggedItem.parentNode.classList.contains('items')) {
            if (draggedItem.originalNextSibling) {
                draggedItem.originalParent.insertBefore(draggedItem, draggedItem.originalNextSibling);
            } else {
                draggedItem.originalParent.appendChild(draggedItem);
            }
        }
        
        // Remove the placeholder
        if (placeholder && placeholder.parentNode) {
            placeholder.remove();
        }
        
        // Adjust the height of affected containers
        const affectedContainers = [
            draggedItem.closest('.row'),
            draggedItem.originalParent.closest('.row'),
            document.querySelector('.images').closest('.row')
        ];
        
        affectedContainers.forEach(container => {
            if (container) adjustRowHeight(container);
        });
        
        // Clear the stored original position
        delete draggedItem.originalParent;
        delete draggedItem.originalNextSibling;
    }
    
    placeholder = null;
    draggedItem = null;
});

document.getElementById('export-button').addEventListener('click', exportTierlist);

document.getElementById('import-input').addEventListener('change', function(event) {
    const fileName = event.target.files[0]?.name;
    document.getElementById('file-name').textContent = fileName || '';
});