const MAX_NAME_LEN = 200;
const DEFAULT_TIERS = [
    { name: '', icon: 'assets/equipments/GodlyRankEquip.webp', color: '#59dffa' },
    { name: '', icon: 'assets/equipments/ZplusRankEquip.webp', color: '#f979ad' },
    { name: '', icon: 'assets/equipments/ZRankEquip.webp', color: '#f8d423' },
    { name: '', icon: 'assets/equipments/SRankEquip.webp', color: '#d85cfb' },
    { name: '', icon: 'assets/equipments/ARankEquip.webp', color: '#7dc6f6' },
    { name: '', icon: 'assets/equipments/BRankEquip.webp', color: '#70d46c' },
    { name: '', icon: 'assets/equipments/CRankEquip.webp', color: '#c6d0b3' },
    { name: '', icon: 'assets/equipments/DRankEquip.webp', color: '#b4b49e' },
    { name: '', icon: 'assets/equipments/ERankEquip.webp', color: '#a5b3a3' },
    { name: '', icon: 'assets/equipments/FRankEquip.webp', color: '#788080' }
];

let unique_id = 0;

let unsaved_changes = false;

let currentDroppable = null;

// Contains [[header, input, label]]
let all_headers = [];
let headers_orig_min_width;

// DOM elems
let untiered_images;
let tierlist_div = document.querySelector('.tierlist');
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

function updateRowBorders() {
    const rows = Array.from(tierlist_div.children);
    rows.forEach((row, index) => {
        if (index === rows.length - 1) {
            row.style.borderBottom = '1px solid black';
        } else {
            row.style.borderBottom = 'none';
        }
    });
}

function adjustRowHeight(row) {
    const header = row.querySelector('.header');
    const items = row.querySelector('.items');
    const rowButtons = row.querySelector('.row-buttons');
    
    // Reset heights to auto to get the natural content height
    header.style.height = 'auto';
    items.style.height = 'auto';
    row.style.height = 'auto';
    rowButtons.style.height = 'auto';
    
    // Calculate the new height
    const headerHeight = header.scrollHeight;
    const itemsHeight = items.scrollHeight;
    const newHeight = Math.max(headerHeight, itemsHeight, 50); // Minimum height of 50px
    
    // Set the new height
    row.style.height = `${newHeight}px`;
    header.style.height = `${newHeight}px`;
    items.style.height = `${newHeight}px`;
    rowButtons.style.height = `${newHeight}px`;

    // Update borders for all rows
    updateRowBorders();
}

function adjustBottomContainerHeight() {
    const bottomContainer = document.querySelector('.images');
    const items = bottomContainer.querySelectorAll('.item');
    const containerWidth = bottomContainer.clientWidth;
    const itemWidth = 50;
    const itemHeight = 50;
    const itemsPerRow = Math.floor(containerWidth / itemWidth);
    const rowsNeeded = Math.ceil(items.length / itemsPerRow);
    const newHeight = rowsNeeded * itemHeight;
    
    bottomContainer.style.height = `${newHeight}px`;
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
    const template = document.getElementById('row-template');
    if (!template) {
        console.error("Row template not found. Unable to add new row.");
        return null;
    }

    const row = template.content.cloneNode(true).querySelector('.row');
    if (!row) {
        console.error("Row element not found in template.");
        return null;
    }
    
    const header = row.querySelector('.header');
    const items = row.querySelector('.items');

    // Set background color
    header.style.backgroundColor = tierData.color || '#fc3f32';

    // Create icon element only if there's an icon
    if (tierData.icon && tierData.icon !== '') {
        let icon = document.createElement('img');
        icon.classList.add('tier-icon');
        icon.src = tierData.icon;
        icon.style.display = 'inline-block';
        header.appendChild(icon);
        header.dataset.hasIcon = 'true';
    } else {
        header.dataset.hasIcon = 'false';
    }

    // Add event listeners
    row.querySelector('.gear-button').addEventListener('click', () => changeTierAttributes(row));
    row.querySelector('.shift-up').addEventListener('click', () => shiftRowUp(row));
    row.querySelector('.shift-down').addEventListener('click', () => shiftRowDown(row));

    let rows = tierlist_div.children;
    if (index === rows.length) {
        tierlist_div.appendChild(row);
    } else {
        let nxt_child = rows[index];
        tierlist_div.insertBefore(row, nxt_child);
    }

    make_accept_drop(row);
    create_label_input(row, index, tierData.name || '');
    observeItemChanges(row);

    return row;
}

function updateRowButtonsVisibility() {
    const rows = document.querySelectorAll('.tierlist .row');
    rows.forEach((row, index) => {
        const upButton = row.querySelector('.shift-buttons input[value="↑"]');
        const downButton = row.querySelector('.shift-buttons input[value="↓"]');
        
        if (upButton) upButton.style.display = index === 0 ? 'none' : 'block';
        if (downButton) downButton.style.display = index === rows.length - 1 ? 'none' : 'block';
    });
}

function shiftRowUp(row) {
    let prevRow = row.previousElementSibling;
    if (prevRow) {
        tierlist_div.insertBefore(row, prevRow);
        unsaved_changes = true;
        updateRowButtonsVisibility();
    }
}

function shiftRowDown(row) {
    let nextRow = row.nextElementSibling;
    if (nextRow) {
        tierlist_div.insertBefore(nextRow, row);
        unsaved_changes = true;
        updateRowButtonsVisibility();
    }
}

function showTierAttributesPopup(row) {
    closeAllEditTierPopups();

    let header = row.querySelector('.header');
    let icon = header.querySelector('.tier-icon');
    let label = header.querySelector('label');

    let popup = document.createElement('div');
    popup.classList.add('tier-attributes-popup');

    // Check if the tier has no icon
    const hasNoIcon = header.dataset.hasIcon === 'false';

    // Combine default tier colors and additional colors
    const defaultColors = DEFAULT_TIERS.map(tier => tier.color);
    const additionalColors = ['#ff7f7e', '#ffbf7f', '#ffdf80', '#feff7f', '#beff7f', '#7eff80'];
    const allColors = [...new Set([...defaultColors, ...additionalColors])];

    // Get the current background color
    const currentColor = rgbToHex(header.style.backgroundColor);

    let content = `
    <div class="popup-header">
        <h2>Edit Tier</h2>
        <button class="close-popup">×</button>
    </div>
    <div class="tier-attributes-content">
        <div class="tier-color-section">
            <label>Tier Color:</label>
            <div class="color-picker-container">
                <div class="color-picker-left">
                    <div class="color-wheel"></div>
                    <div class="color-slider">
                        <div class="color-slider-thumb"></div>
                    </div>
                </div>
                <div class="color-picker-right">
                    <div class="color-input-preview">
                        <input type="text" id="hex-input" value="${currentColor}">
                        <div class="color-preview" style="background-color: ${currentColor}"></div>
                    </div>
                    <div class="color-palette">
                        ${allColors.map(color => `
                            <div class="color-option" style="background-color: ${color};" data-color="${color}"></div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
        <div class="tier-icon-section">
            <label>Tier Icon:</label>
            <div id="tier-icon-selection">
                <div class="tier-icon-row">
                    ${DEFAULT_TIERS.slice(0, 5).map(tier => `
                        <div class="tier-icon-option${!hasNoIcon && icon && icon.src.includes(tier.icon) ? ' selected' : ''}" data-icon="${tier.icon}">
                            <img src="${tier.icon}" alt="${tier.name}" title="${tier.name}">
                        </div>
                    `).join('')}
                </div>
                <div class="tier-icon-row">
                    ${DEFAULT_TIERS.slice(5, 10).map(tier => `
                        <div class="tier-icon-option${!hasNoIcon && icon && icon.src.includes(tier.icon) ? ' selected' : ''}" data-icon="${tier.icon}">
                            <img src="${tier.icon}" alt="${tier.name}" title="${tier.name}">
                        </div>
                    `).join('')}
                </div>
                <div class="tier-icon-row">
                    <div class="tier-icon-option no-icon${hasNoIcon ? ' selected' : ''}" data-icon="">
                        <span>No Icon</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="row-management">
        <div class="row-add-buttons">
            <button id="add-row-above">Add Row Above</button>
            <button id="add-row-below">Add Row Below</button>
        </div>
        <button id="remove-row">Remove Row</button>
    </div>
    `;

    popup.innerHTML = content;
    document.body.appendChild(popup);

    // Close popup when clicking the close button
    popup.querySelector('.close-popup').addEventListener('click', () => {
        document.body.removeChild(popup);
    });

    document.addEventListener('click', function closePopup(e) {
        if (!popup.contains(e.target) && e.target !== row.querySelector('.gear-button')) {
            document.body.removeChild(popup);
            document.removeEventListener('click', closePopup);
        }
    });

    // Color picker functionality
    const colorWheel = popup.querySelector('.color-wheel');
    const colorSlider = popup.querySelector('.color-slider');
    const colorSliderThumb = popup.querySelector('.color-slider-thumb');
    const hexInput = document.getElementById('hex-input');
    const colorPreview = popup.querySelector('.color-preview');

    // Initialize color values from the current background color
    let [hue, saturation, lightness] = hexToHSL(currentColor);

    function updateColor(updateHeader = false) {
        const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        if (updateHeader) {
            header.style.backgroundColor = color;
        }
        colorPreview.style.backgroundColor = color;
        hexInput.value = hslToHex(hue, saturation, lightness);
        colorSlider.style.background = `linear-gradient(to right, hsl(${hue}, 100%, 50%), white)`;
    }

    colorWheel.addEventListener('mousedown', startColorSelection);
    colorSlider.addEventListener('mousedown', startSliderSelection);

    function startColorSelection(e) {
        selectColor(e);
        document.addEventListener('mousemove', selectColor);
        document.addEventListener('mouseup', stopColorSelection);
    }

    function stopColorSelection() {
        document.removeEventListener('mousemove', selectColor);
        document.removeEventListener('mouseup', stopColorSelection);
        updateColor(true);
        unsaved_changes = true;
    }

    function selectColor(e) {
        const rect = colorWheel.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const x = e.clientX - rect.left - centerX;
        const y = e.clientY - rect.top - centerY;
        hue = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        updateColor();
    }

    function startSliderSelection(e) {
        selectSlider(e);
        document.addEventListener('mousemove', selectSlider);
        document.addEventListener('mouseup', stopSliderSelection);
    }

    function stopSliderSelection() {
        document.removeEventListener('mousemove', selectSlider);
        document.removeEventListener('mouseup', stopSliderSelection);
        updateColor(true);
        unsaved_changes = true;
    }

    function selectSlider(e) {
        const rect = colorSlider.getBoundingClientRect();
        let x = e.clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));
        saturation = 100 - (x / rect.width) * 100;
        colorSliderThumb.style.left = `${x}px`;
        updateColor();
    }

    hexInput.addEventListener('input', (e) => {
        let color = e.target.value;
        if (!color.startsWith('#')) {
            color = '#' + color;
        }
        if (/^#[0-9A-F]{6}$/i.test(color)) {
            [hue, saturation, lightness] = hexToHSL(color);
            updateColor(true);
            unsaved_changes = true;
        }
    });

    // Color palette selection
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => {
            const color = option.dataset.color;
            [hue, saturation, lightness] = hexToHSL(color);
            updateColor(true);
            unsaved_changes = true;
        });
    });

    // Initial color update
    updateColor();

    // Icon selection
    document.querySelectorAll('.tier-icon-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.tier-icon-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            
            let newIcon = option.dataset.icon;
            
            // Remove existing icon if there is one
            let existingIcon = header.querySelector('.tier-icon');
            if (existingIcon) {
                existingIcon.remove();
            }

            if (newIcon) {
                let icon = document.createElement('img');
                icon.src = newIcon;
                icon.classList.add('tier-icon');
                icon.style.display = 'inline-block';
                header.insertBefore(icon, header.firstChild);
                header.dataset.hasIcon = 'true';
            } else {
                header.dataset.hasIcon = 'false';
            }

            unsaved_changes = true;
        });
    });

    document.getElementById('add-row-above').addEventListener('click', () => {
        let newRow = add_row(Array.from(tierlist_div.children).indexOf(row), { name: 'NEW', color: '#fc3f32' });
        newRow.querySelector('.header').style.backgroundColor = '#fc3f32';
        unsaved_changes = true;
    });

    document.getElementById('remove-row').addEventListener('click', () => {
        let rows = Array.from(tierlist_div.querySelectorAll('.row'));
        if (rows.length < 2) return;
        let idx = rows.indexOf(row);
        rm_row(idx);
        document.body.removeChild(popup);
        unsaved_changes = true;
    });

    document.getElementById('add-row-below').addEventListener('click', () => {
        let newRow = add_row(Array.from(tierlist_div.children).indexOf(row) + 1, { name: 'NEW', color: '#fc3f32' });
        newRow.querySelector('.header').style.backgroundColor = '#fc3f32';
        unsaved_changes = true;
    });
}

function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHSL(H) {
    let r = 0, g = 0, b = 0;
    if (H.length == 4) {
        r = "0x" + H[1] + H[1];
        g = "0x" + H[2] + H[2];
        b = "0x" + H[3] + H[3];
    } else if (H.length == 7) {
        r = "0x" + H[1] + H[2];
        g = "0x" + H[3] + H[4];
        b = "0x" + H[5] + H[6];
    }
    r /= 255;
    g /= 255;
    b /= 255;
    let cmin = Math.min(r,g,b),
        cmax = Math.max(r,g,b),
        delta = cmax - cmin,
        h = 0,
        s = 0,
        l = 0;

    if (delta == 0)
        h = 0;
    else if (cmax == r)
        h = ((g - b) / delta) % 6;
    else if (cmax == g)
        h = (b - r) / delta + 2;
    else
        h = (r - g) / delta + 4;

    h = Math.round(h * 60);

    if (h < 0)
        h += 360;

    l = (cmax + cmin) / 2;
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return [h, s, l];
}

function changeTierAttributes(row) {
    closeAllPopups();
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

function createFilterButtons() {
    fetch('filter_options.json')
        .then(response => response.json())
        .then(filterOptions => {
            const filterContainer = document.getElementById('filter-container');
            
            Object.entries(filterOptions).forEach(([attr, options]) => {
                const buttonContainer = document.createElement('div');
                buttonContainer.classList.add('filter-button-container');

                const button = document.createElement('button');
                button.textContent = attr.charAt(0).toUpperCase() + attr.slice(1);
                button.classList.add('filter-button');
                
                buttonContainer.appendChild(button);

                const popup = document.createElement('div');
                popup.classList.add('filter-popup');
                
                let maxOptionWidth = 0;
                
                if (attr === 'tags') {
                    const allTagsContainer = document.createElement('div');
                    allTagsContainer.classList.add('include-all-container');

                    const allTagsLabel = document.createElement('label');
                    allTagsLabel.classList.add('filter-option', 'include-all-option');
                    
                    const allTagsCheckbox = document.createElement('input');
                    allTagsCheckbox.type = 'checkbox';
                    allTagsCheckbox.id = `include-all-${attr}`;
                    allTagsCheckbox.addEventListener('change', applyFilters);
                    
                    allTagsLabel.appendChild(allTagsCheckbox);
                    allTagsLabel.appendChild(document.createTextNode('Include all selected tags'));
                    allTagsContainer.appendChild(allTagsLabel);
                    popup.appendChild(allTagsContainer);

                    // Measure width of "Include all selected tags"
                    maxOptionWidth = Math.max(maxOptionWidth, getTextWidth('Include all selected tags'));
                }
                
                const optionsContainer = document.createElement('div');
                optionsContainer.classList.add('options-container');
                
                options.forEach(option => {
                    const label = document.createElement('label');
                    label.classList.add('filter-option');
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = option;
                    
                    // Add event listener to each checkbox
                    checkbox.addEventListener('change', applyFilters);
                    
                    label.appendChild(checkbox);
                    label.appendChild(document.createTextNode(option));
                    optionsContainer.appendChild(label);
                    
                    // Measure the width of this option
                    maxOptionWidth = Math.max(maxOptionWidth, getTextWidth(option));
                });

                popup.appendChild(optionsContainer);
                
                // Set the width of the popup, accounting for checkbox, padding, and potential scrollbar
                popup.style.width = `${maxOptionWidth + 60}px`; // 60px for checkbox, padding, and scrollbar
                
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isCurrentPopupOpen = popup.style.display === 'block';
                    closeAllPopups();
                    if (!isCurrentPopupOpen) {
                        popup.style.display = 'block';
                        // Check if scrollbar is present and adjust width if necessary
                        if (popup.scrollHeight > popup.clientHeight) {
                            popup.style.width = `${maxOptionWidth + 77}px`; // Additional 17px for scrollbar
                        }
                    }
                });
                
                popup.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                
                buttonContainer.appendChild(popup);
                filterContainer.appendChild(buttonContainer);
            });

            // Close popups when clicking outside
            document.addEventListener('click', closeAllPopups);

            console.log("Filter buttons created");
        })
        .catch(error => console.error('Error loading filter options:', error));
}

function getTextWidth(text) {
    const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = "16px sans-serif"; // Match this with your CSS font settings
    const metrics = context.measureText(text);
    return metrics.width;
}

function applyFilters() {
    console.log("Applying filters...");
    const filters = {};
    document.querySelectorAll('.filter-button-container').forEach(container => {
        const button = container.querySelector('.filter-button');
        const popup = container.querySelector('.filter-popup');
        const attr = button.textContent.toLowerCase();
        filters[attr] = {
            values: Array.from(popup.querySelectorAll('input:not([id^="include-all"]):checked')).map(input => input.value),
            includeAll: attr === 'tags' ? popup.querySelector('#include-all-tags').checked : false
        };
    });
    
    console.log("Filters:", filters);

    const searchTerm = document.getElementById('image-search').value.toLowerCase();
    const items = document.querySelectorAll('.images .item');
    console.log("Total items:", items.length);

    let visibleCount = 0;
    items.forEach(item => {
        const img = item.querySelector('.draggable');
        let show = true;
        
        // Apply search filter
        if (searchTerm) {
            const name = img.dataset.name.toLowerCase();
            if (!name.includes(searchTerm)) {
                show = false;
            }
        }
        
        // Apply other filters only if the item passes the search filter
        if (show) {
            for (let [attr, filterData] of Object.entries(filters)) {
                if (filterData.values.length === 0) continue;
                
                if (attr === 'color') {
                    const charColors = JSON.parse(img.dataset.color);
                    if (!filterData.values.some(v => charColors.includes(v))) {
                        show = false;
                        break;
                    }
                } else if (attr === 'tags') {
                    const charTags = img.dataset.tags.split(',');
                    if (filterData.includeAll) {
                        if (!filterData.values.every(v => charTags.includes(v))) {
                            show = false;
                            break;
                        }
                    } else {
                        if (!filterData.values.some(v => charTags.includes(v))) {
                            show = false;
                            break;
                        }
                    }
                } else if (attr === 'episode' || attr === 'type') {
                    const charTags = img.dataset.tags.split(',');
                    if (!filterData.values.some(v => charTags.includes(v))) {
                        show = false;
                        break;
                    }
                } else if (attr === 'zenkai') {
                    const hasZenkai = img.dataset.zenkai === 'true';
                    if ((hasZenkai && !filterData.values.includes('Zenkai')) || (!hasZenkai && !filterData.values.includes('Non Zenkai'))) {
                        show = false;
                        break;
                    }
                } else {
                    if (!filterData.values.includes(img.dataset[attr])) {
                        show = false;
                        break;
                    }
                }
            }
        }
        
        item.style.display = show ? '' : 'none';
        if (show) visibleCount++;
    });

    console.log("Visible items after filtering:", visibleCount);
    
    adjustRowHeight(document.querySelector('.images').closest('.row') || document.querySelector('.images'));
    sortImages(); // Re-sort images after filtering
}

function closeAllPopups() {
    document.querySelectorAll('.filter-popup').forEach(popup => {
        popup.style.display = 'none';
    });
}

function loadImagesFromJson() {
    fetch('units.json')
        .then(response => response.json())
        .then(data => {
            const imagesContainer = document.querySelector('.images');
            data.forEach(character => {
                const img = create_img_with_src(character.image_url);
                let draggable = img.querySelector('.draggable');
                draggable.dataset.rarity = character.rarity;
                draggable.dataset.cardNumber = character.id;
                draggable.setAttribute('data-path', character.image_url);
                draggable.dataset.name = character.name;
                draggable.dataset.color = JSON.stringify(character.color);
                draggable.dataset.tags = character.tags.join(',');
                draggable.dataset.zenkai = character.has_zenkai;
                imagesContainer.appendChild(img);
            });

            console.log(`Loaded ${data.length} characters`);
            
            createFilterButtons();
            sortImages();
            adjustRowHeight(imagesContainer.closest('.row') || imagesContainer);
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

    searchInput.addEventListener('input', applyFilters);
}

function exportTierlist() {
    console.log("Starting export process...");
    let fileName = prompt("Enter a name for your tierlist:", "my_tierlist");
    if (!fileName) {
        console.log("Export cancelled: No filename provided");
        return;
    }

    let serializedTierlist = {
        tiers: [],
        untieredImages: []
    };

    console.log("Serializing tiers...");
    document.querySelectorAll('.row').forEach((row, index) => {
        let headerElement = row.querySelector('.header');
        let iconElement = headerElement.querySelector('.tier-icon');
        let tier = {
            name: headerElement.querySelector('label').innerText,
            color: headerElement.style.backgroundColor,
            icon: iconElement ? iconElement.src : '',
            images: []
        };

        console.log(`Serializing tier ${index}:`, tier);

        row.querySelectorAll('.items .item').forEach(item => {
            let img = item.querySelector('.draggable');
            let imageData = {
                src: img.dataset.path,
                rarity: img.dataset.rarity,
                cardNumber: img.dataset.cardNumber,
                name: img.dataset.name,
                color: img.dataset.color,
                tags: img.dataset.tags.split(','),
                zenkai: img.dataset.zenkai === 'true'
            };
            tier.images.push(imageData);
        });

        console.log(`Tier ${index} has ${tier.images.length} images`);
        serializedTierlist.tiers.push(tier);
    });

    console.log("Serializing untiered images...");
    document.querySelectorAll('.images .item').forEach(item => {
        let img = item.querySelector('.draggable');
        let imageData = {
            src: img.dataset.path,
            rarity: img.dataset.rarity,
            cardNumber: img.dataset.cardNumber,
            name: img.dataset.name,
            color: img.dataset.color,
            tags: img.dataset.tags.split(','),
            zenkai: img.dataset.zenkai === 'true'
        };
        serializedTierlist.untieredImages.push(imageData);
    });

    console.log(`Untiered images: ${serializedTierlist.untieredImages.length}`);

    console.log("Saving to file...");
    let blob = new Blob([JSON.stringify(serializedTierlist, null, 2)], {type: 'application/json'});
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.json`;
    a.click();

    console.log("Export completed");
}

function importTierlist(file) {
    console.log("Starting import process...");
    let reader = new FileReader();
    reader.onload = function(e) {
        console.log("File read complete. Parsing JSON...");
        let serializedTierlist;
        try {
            serializedTierlist = JSON.parse(e.target.result);
            console.log("JSON parsed successfully:", serializedTierlist);
        } catch (error) {
            console.error("Error parsing JSON:", error);
            alert("Error importing file. Please make sure it's a valid JSON file.");
            return;
        }

        console.log("Clearing current tierlist...");
        const tierlistContainer = document.querySelector('.tierlist');
        const imagesContainer = document.querySelector('.images');
        tierlistContainer.innerHTML = '';
        imagesContainer.innerHTML = '';

        console.log("Recreating tiers...");
        if (serializedTierlist.tiers && Array.isArray(serializedTierlist.tiers)) {
            serializedTierlist.tiers.forEach((tier, index) => {
                console.log(`Creating tier ${index}:`, tier);
                let row = add_row(index, {
                    name: tier.name || "",
                    icon: tier.icon || '',
                    color: tier.color || '#fc3f32'
                });
                
                if (row) {
                    console.log(`Row ${index} created successfully`);
                    if (tier.images && Array.isArray(tier.images)) {
                        console.log(`Adding ${tier.images.length} images to tier ${index}`);
                        tier.images.forEach(imgData => {
                            let img = create_img_with_src(imgData.src);
                            let draggable = img.querySelector('.draggable');
                            Object.assign(draggable.dataset, {
                                rarity: imgData.rarity || '',
                                cardNumber: imgData.cardNumber || '',
                                name: imgData.name || '',
                                color: imgData.color || '',
                                tags: Array.isArray(imgData.tags) ? imgData.tags.join(',') : '',
                                zenkai: imgData.zenkai || false
                            });
                            row.querySelector('.items').appendChild(img);
                        });
                    } else {
                        console.warn(`No images or invalid images for tier ${index}`);
                    }
                } else {
                    console.error(`Failed to create row for tier ${index}`);
                }
            });
        } else {
            console.error("Invalid or missing tiers in imported data");
        }

        console.log("Recreating untiered images...");
        if (serializedTierlist.untieredImages && Array.isArray(serializedTierlist.untieredImages)) {
            console.log(`Adding ${serializedTierlist.untieredImages.length} untiered images`);
            serializedTierlist.untieredImages.forEach(imgData => {
                let img = create_img_with_src(imgData.src);
                let draggable = img.querySelector('.draggable');
                Object.assign(draggable.dataset, {
                    rarity: imgData.rarity || '',
                    cardNumber: imgData.cardNumber || '',
                    name: imgData.name || '',
                    color: imgData.color || '',
                    tags: Array.isArray(imgData.tags) ? imgData.tags.join(',') : '',
                    zenkai: imgData.zenkai || false
                });
                imagesContainer.appendChild(img);
            });
        } else {
            console.error("Invalid or missing untiered images in imported data");
        }

        console.log("Adjusting row heights and sorting images...");
        document.querySelectorAll('.row').forEach(row => {
            adjustRowHeight(row);
        });
        adjustRowHeight(imagesContainer.closest('.row') || imagesContainer);
        sortImages();

        console.log("Import completed");
    };
    reader.onerror = function(error) {
        console.error("Error reading file:", error);
        alert("Error reading the file. Please try again.");
    };
    console.log("Starting to read file...");
    reader.readAsText(file);
}

window.addEventListener('load', () => {
    untiered_images = document.querySelector('.images');
    tierlist_div = document.querySelector('.tierlist');

    for (let i = 0; i < DEFAULT_TIERS.length; ++i) {
        add_row(i, DEFAULT_TIERS[i]);
    }

    headers_orig_min_width = all_headers[0][0].clientWidth;

    make_accept_drop(document.querySelector('.images'));

    setupSearchFeature();

    updateRowBorders();

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
        adjustBottomContainerHeight();
    });
    
    document.querySelectorAll('.row').forEach(row => {
        adjustRowHeight(row);
        observeItemChanges(row);
    });

    // Adjust the untiered images container
    adjustRowHeight(document.querySelector('.images').closest('.row') || document.querySelector('.images'));

    sortImages();
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

function resetFilters() {
    console.log("Resetting filters...");
    
    // Reset all checkboxes
    document.querySelectorAll('#filter-container input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Reset search input
    document.getElementById('image-search').value = '';

    // Reset sort options
    document.querySelectorAll('#sort-dropdown input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Set card number sorting to checked and descending
    const cardNumberCheckbox = document.getElementById('sort-card-number');
    if (cardNumberCheckbox) {
        cardNumberCheckbox.checked = true;
    }

    const cardNumberOrderToggle = document.getElementById('sort-card-number-order');
    if (cardNumberOrderToggle) {
        cardNumberOrderToggle.textContent = '▼';
        cardNumberOrderToggle.dataset.order = 'desc';
    }

    // Reset other sort order buttons
    document.querySelectorAll('.order-toggle:not(#sort-card-number-order)').forEach(button => {
        button.textContent = '▼';
        button.dataset.order = 'desc';
    });

    // Apply the reset filters
    applyFilters();

    console.log("Filters reset complete");
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed");

    const sortButton = document.getElementById('sort-button');
    const sortDropdown = document.getElementById('sort-dropdown');

    sortButton.addEventListener('click', function(e) {
        e.stopPropagation();
        sortDropdown.style.display = sortDropdown.style.display === 'block' ? 'none' : 'block';
    });

    // Handle checkboxes and order toggle buttons
    document.querySelectorAll('#sort-dropdown input[type="checkbox"], .order-toggle').forEach(element => {
        element.addEventListener('click', function() {
            if (this.classList.contains('order-toggle')) {
                const currentOrder = this.dataset.order;
                this.dataset.order = currentOrder === 'desc' ? 'asc' : 'desc';
                this.textContent = currentOrder === 'desc' ? '▲' : '▼';
            }
            sortImages();
        });
    });

    // Close the dropdown if the user clicks outside of it
    document.addEventListener('click', function(event) {
        if (!sortButton.contains(event.target) && !sortDropdown.contains(event.target)) {
            sortDropdown.style.display = 'none';
        }
    });

    // Load images and apply initial sorting
    loadImagesFromJson();
});

document.addEventListener('DOMContentLoaded', function() {
    const resetFiltersButton = document.getElementById('reset-filters-button');
    console.log("Reset filters button:", resetFiltersButton);

    if (resetFiltersButton) {
        console.log("Adding click event listener to reset filters button");
        resetFiltersButton.addEventListener('click', function() {
            console.log("Reset filters button clicked");
            resetFilters();
        });
    } else {
        console.error("Reset filters button not found in the DOM");
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    const dropZone = document.getElementById('import-drop-zone');
    const fileInput = document.getElementById('import-input');

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);

    function preventDefaults (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        dropZone.classList.add('highlight');
    }

    function unhighlight(e) {
        dropZone.classList.remove('highlight');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        handleFiles(files);
    }

    function handleFiles(files) {
        if (files.length) {
            const file = files[0];
            if (file.name.endsWith('.json')) {
                importTierlist(file);
                document.getElementById('file-name').textContent = file.name;
            } else {
                alert('Please drop a JSON file.');
            }
        }
    }

    // Also handle files from input
    fileInput.addEventListener('change', function(e) {
        handleFiles(this.files);
    });
});

function closeAllEditTierPopups() {
    const existingPopups = document.querySelectorAll('.tier-attributes-popup');
    existingPopups.forEach(popup => {
        document.body.removeChild(popup);
    });
}

function sortImages() {
    console.log("Sorting images...");
    
    const imagesContainer = document.querySelector('.images');
    const items = Array.from(imagesContainer.querySelectorAll('.item'));

    const sortCardNumber = document.getElementById('sort-card-number').checked;
    const sortColor = document.getElementById('sort-color').checked;
    const sortRarity = document.getElementById('sort-rarity').checked;

    const cardNumberOrder = document.getElementById('sort-card-number-order').dataset.order;
    const colorOrder = document.getElementById('sort-color-order').dataset.order;
    const rarityOrder = document.getElementById('sort-rarity-order').dataset.order;

    const colorOrderArray = ['RED', 'BLU', 'GRN', 'PUR', 'YEL', 'LGT', 'DRK'];
    const rarityOrderArray = ['HERO', 'EXTREME', 'SPARKING', 'LEGENDS LIMITED', 'ULTRA'];

    function getColorScore(colorData) {
        let colors;
        try {
            colors = JSON.parse(colorData);
        } catch (e) {
            console.error("Error parsing color data:", e);
            colors = colorData;
        }
        
        if (typeof colors === 'string') {
            colors = [colors];
        }
        
        if (!Array.isArray(colors)) {
            console.error("Invalid color data after processing:", colors);
            return -1;
        }
        
        let score = colorOrderArray.indexOf(colors[0]) * 100;
        if (colors.length > 1) {
            score += colorOrderArray.indexOf(colors[1]);
        }
        return score;
    }

    items.sort((a, b) => {
        let comparison = 0;

        const itemAData = a.querySelector('.draggable').dataset;
        const itemBData = b.querySelector('.draggable').dataset;

        if (sortColor) {
            const scoreA = getColorScore(itemAData.color);
            const scoreB = getColorScore(itemBData.color);
            comparison = scoreA - scoreB;
            
            if (colorOrder === 'asc') comparison *= -1;
            if (comparison !== 0) return comparison;
        }

        if (sortRarity) {
            comparison = rarityOrderArray.indexOf(itemBData.rarity) - rarityOrderArray.indexOf(itemAData.rarity);
            if (rarityOrder === 'asc') comparison *= -1;
            if (comparison !== 0) return comparison;
        }

        // Always sort by Card Number as the final criteria or if no other sort is selected
        comparison = itemBData.cardNumber.localeCompare(itemAData.cardNumber, undefined, {numeric: true, sensitivity: 'base'});
        if (sortCardNumber && cardNumberOrder === 'asc') comparison *= -1;

        return comparison;
    });

    imagesContainer.innerHTML = '';
    items.forEach(item => imagesContainer.appendChild(item));
    adjustRowHeight(imagesContainer.closest('.row') || imagesContainer);

    console.log("Sorting complete");
}

document.getElementById('export-button').addEventListener('click', exportTierlist);

document.getElementById('import-button').addEventListener('click', function() {
    document.getElementById('import-input').click();
});

document.getElementById('import-input').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        importTierlist(file);
        // Update the file name display
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-name-container').style.display = 'block';
    }
});

// Initially hide the file name container
document.getElementById('file-name-container').style.display = 'none';