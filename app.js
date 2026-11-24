//getting all needed HTML elements
const errorArea = document.getElementById("errors");


const searchBox = document.getElementById("searchbox");
const filterSoundtype = document.getElementById("filter_soundtype");
const filterCategory = document.getElementById("filter_category");
const filterGenre = document.getElementById("filter_genre");
const filterKey = document.getElementById("filter_key");
const bpmMin = document.getElementById("bpm_min");
const bpmMax = document.getElementById("bpm_max");
const noMatches = document.getElementById("no_matches");

// editing elements
const editForm = document.getElementById("edit_form");
const editTitle = document.getElementById("edit_title");
const editInfo = document.getElementById("edit_info");
const editSoundtype = document.getElementById("edit_soundtype");
const editCategory = document.getElementById("edit_category");
const editGenre = document.getElementById("edit_genre");
const editKey = document.getElementById("edit_key");
const editBpm = document.getElementById("edit_bpm");
const bpmError = document.getElementById("bpm_error");
let editingSample=null; 

//writes a specific message in the error box
function showError(message) {
    errorArea.textContent = message
}
//clears the error box message
function clearError() {
    errorArea.textContent = ""
}


//seconds to minutes
function readableDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ":" + String(secs).padStart(2, "0");
}

//turns unformatted date (called "iso date" by javaScript) into an actual readable date
function readableDate(unformattedDate) {
    return new Date(unformattedDate).toLocaleDateString("en-GB");
}

function findGaps(value) {
    if (value === "" || value === null) {
        return "—";
    }
    return value;
}



//this is the main table being added to
const libbody = document.getElementById("lib_body");

//adds a cell to the table with provided row/text
function addCell(row, text) {
    const cell = document.createElement("td");
    cell.textContent = text;
    row.appendChild(cell);
}

// makes every button show in the actions section of the table
function makeButton(actualtext, showswhenhovering, onClick) {
    const button = document.createElement("button");
    button.textContent = actualtext;
    button.title = showswhenhovering;
    button.addEventListener("click", onClick);
    return button;
}

// loads every sample and builds one table row for each
function refreshLibrary() {


    getAllSamples(function (samples) {
        libbody.textContent = "";// remove old rows so nothing is duplicated

        const fltr = readFilters();

        //gets list of samples which actually match filters
        const output =  [];
        for (const sample of samples) {
            if (checkFltrMatch(sample, fltr)) {
                output.push(sample);
            }
        }
        if (output.length>0){
            noMatches.hidden=true;
        } else {
            noMatches.hidden=false;
        }

        for (const sample of output) {
            const row = document.createElement("tr");

            addCell(row, sample.filename);
            addCell(row, findGaps(sample.soundType));
            addCell(row, findGaps(sample.category));
            addCell(row, findGaps(sample.genre));
            addCell(row, findGaps(sample.key));
            addCell(row, findGaps(sample.bpm));
            addCell(row, readableDuration(sample.duration));
            addCell(row, readableDate(sample.uploadDate));

            //for each row, in actions, add each type of button 
            const actions = document.createElement("td");
            actions.appendChild(makeButton("▶", "Play", function () { doPlay(sample); }));
            actions.appendChild(makeButton("❚❚", "Pause", function () { doPause(sample); }));
            actions.appendChild(makeButton("↺", "Reset", function () { doReset(sample); }));
            actions.appendChild(makeButton("⬇", "Download", function () { doDownload(sample.soundID); }));
            actions.appendChild(makeButton("✎", "Edit", function () { openEditForm(sample.soundID); }));
            row.appendChild(actions);
            libbody.appendChild(row);
        }
    });


}



// if one of the filtering aspects is triggered, run refreshlibrary
searchBox.addEventListener("input", refreshLibrary);
bpmMin.addEventListener("input", refreshLibrary);
bpmMax.addEventListener("input", refreshLibrary);
filterSoundtype.addEventListener("change", refreshLibrary);
filterCategory.addEventListener("change", refreshLibrary);
filterGenre.addEventListener("change", refreshLibrary);
filterKey.addEventListener("change", refreshLibrary);

//make clear button work
document.getElementById("clear_filters").addEventListener("click", function () {
    searchBox.value = "";
    filterSoundtype.value = "";
    filterCategory.value = "";
    filterGenre.value = "";
    filterKey.value = "";
    bpmMin.value = "";
    bpmMax.value = "";
    refreshLibrary();
});



//get drop zone made in HTML file
const dropZone = document.getElementById("drop_zone");

// if you drag over this with a something (a file in this case), it signals that some type of function can actually occur
dropZone.addEventListener("dragover", function (event) {
    event.preventDefault();
});

// if hovering over the zone, dropping will trigger a sequence of events
dropZone.addEventListener("drop", function (event) {
    event.preventDefault();
    clearError();

    //any file dropped in the event
    const files = event.dataTransfer.files;

    // this rejects whatever isnt wav/mp3 then moves to the next file
    for (const specificfile of files) {
        if (!isAudioFile(specificfile)) {
            showError(specificfile.name + " isn't a WAV or MP3 file, so it can't be uploaded");
            continue;
        } else {

            getDuration(specificfile,
                function (seconds) {
                    // Builds a savable record
                    const record = {
                        //extracted from audio file
                        filename: specificfile.name,
                        blob: specificfile, //blob is the sound itself
                        fileType: specificfile.type,
                        duration: seconds,
                        uploadDate: new Date().toISOString(),
                        //filled in later by user
                        soundType: "",
                        category: "",
                        genre: "",
                        key: "",
                        bpm: null,
                    };


                    addSample(record, refreshLibrary);

                },
                function () {
                    showError(specificfile.name + " couldn't be read as audio, so not added");
                }
            );
        }
    }
});

// audio types app will accept (this is ONLY wav/mp3, there are many because different systems have different type names in their console log)
const allowedTypes = ["audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg", "audio/mp3"];

// checks mime type as well as name ending to verify if the file is valid
function isAudioFile(file) {
    const name = file.name.toLowerCase();
    const goodExtension = name.endsWith(".wav") || name.endsWith(".mp3");
    const goodType = allowedTypes.includes(file.type);

    if (goodExtension || goodType){
        return true;
    } else {
        return false;
    }
}

// gets audiofile length in seconds and checks for failire
function getDuration(file, whenDone, whenFailed) {
    //creating an audio player in the background since js cant get file length by default
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";  
    let answered = false;

    // occurs if file's details read succesfully
    audio.addEventListener("loadedmetadata", function () {
        if (answered) return;
        answered = true;

        const seconds = audio.duration;
        audio.removeAttribute("src");
        audio.load();
        URL.revokeObjectURL(url);
        whenDone(seconds);
    });

    // occurs if it fails
    audio.addEventListener("error", function () {
        if (answered) return;
        answered = true;

        URL.revokeObjectURL(url);
        whenFailed();
    });

    audio.src = url;
}



// choices for dropdowns (types, categories, genres, keys)
const soundTypes = ["One shot", "Loop"];
const categories = ["Drums", "Bass", "Keys", "Synth", "Vocals", "FX", "Other"];
const genres = ["Trap", "Drill", "Hip-hop", "Lo-fi", "House", "Techno", "Pop", "R&B", "Other"];

// all of the keys going up in order (chromatic scales)
//didn't include flats because they can be represented by sharp keys
const notesmajor = ["Cmaj", "C#maj", "Dmaj", "D#maj", "Emaj", "Fmaj", "F#maj", "Gmaj", "G#maj", "Amaj", "A#maj", "Bmaj"];
const notesminor = ["Cmin", "C#min", "Dmin", "D#min", "Emin", "Fmin", "F#min", "Gmin", "G#min", "Amin", "A#min", "Bmin"];
const keys = notesmajor.concat(notesminor);

// Adds one <option> to a dropdown for each choice in a list for efficiency
function fillDropdown(dropdownId, choices) {
    const dropdown = document.getElementById(dropdownId);
    for (const choice of choices) {
        const option = document.createElement("option");
        option.value = choice;
        option.textContent = choice;
        dropdown.appendChild(option);
    }
}

// fill the filter dropdowns when the page loads
fillDropdown("filter_soundtype", soundTypes);
fillDropdown("filter_category", categories);
fillDropdown("filter_genre", genres);
fillDropdown("filter_key", keys);
//for edit box (the user needs options here too)
fillDropdown("edit_soundtype", soundTypes);
fillDropdown("edit_category", categories);
fillDropdown("edit_genre", genres);
fillDropdown("edit_key", keys);

//returns object with the USERS searches (not the actual sample metadata)
function readFilters() {
    return {
    search: searchBox.value.trim().toLowerCase(),
    soundType: filterSoundtype.value,
    category: filterCategory.value,
    genre: filterGenre.value,
    key: filterKey.value,
    minBpm: bpmMin.value,
    maxBpm: bpmMax.value
    };
}

// search logic (if a sample matches deosnt match a selected filler, return false otherwise return true)
function checkFltrMatch(sample, filters) {
    if (!sample.filename.toLowerCase().includes(filters.search))
    {
        return false;
    } 
    if (filters.soundType!=="" && sample.soundType!==filters.soundType){
        return false;
    } 
    if (filters.category!== "" && sample.category!==filters.category) 
    {
        return false;
    }
    if (filters.genre!== "" && sample.genre!==filters.genre) 
    {
        return false;
    }
    if (filters.key!=="" && sample.key!==filters.key) 
    {
        return false;
    }
    if (filters.minBpm!== ""&& (sample.bpm === null || sample.bpm < Number(filters.minBpm))) 
    {
        return false;
    }
    if (filters.maxBpm!=="" && (sample.bpm === null || sample.bpm > Number(filters.maxBpm))) 
    {
        return false;
    }

    return true;
}


// loads sample in edit form
function openEditForm(soundID) {
    getSample(soundID, function (sample) {
        if (sample===undefined) {
            showError("sample not found, try reloading the page");
            return;
        }

        editingSample = sample;

        editTitle.textContent = sample.filename;
        editInfo.textContent = "Length: " + readableDuration(sample.duration) + ", Added: " + readableDate(sample.uploadDate) + ", File: " + sample.fileType;

        // Fill  inputs w sample's current values
        editSoundtype.value = sample.soundType;
        editCategory.value = sample.category;
        editGenre.value = sample.genre;
        editKey.value = sample.key;
        editBpm.value = sample.bpm;   

        bpmError.textContent = "";    
        editForm.hidden = false;      
    });
}

//save button, cancel button, take in all eddits
function closeEditForm() {
    editForm.hidden = true;
    editingSample = null;
}


document.getElementById("edit_cancel").addEventListener("click", closeEditForm);


document.getElementById("edit_save").addEventListener("click", function () {
    const bpmText = editBpm.value.trim();
    let new_bpm;

//validity bad input means something unreadable was typed or something which is not possible
    if (editBpm.validity.badInput) {
        bpmError.textContent = "BPM must be a whole number between 20 and 300.";
        return;
    }

    if (bpmText === "") {
        new_bpm = null;
    } else {
        new_bpm = Number(bpmText);

        // must be a whole number from 20 to 300
        if (!Number.isInteger(new_bpm) || new_bpm < 20 || new_bpm > 300) {
            bpmError.textContent = "BPM must be a whole number between 20 and 300.";
            return;  
        }
    }

    editingSample.soundType = editSoundtype.value;
    editingSample.category = editCategory.value;
    editingSample.genre = editGenre.value;
    editingSample.key = editKey.value;
    editingSample.bpm = new_bpm;

    updateSample(editingSample, function () {
        closeEditForm();
        refreshLibrary();
    });
});

//HOWLER FUNCTIONS

let currentSound = null;     
let currentSoundID = null; 
let currentUrl = null; 

// Stops and unloads whatever sample is loaded, so sounds never overlap (R6)
function unloadCurrentSound() {
    if (currentSound !== null) {
        currentSound.unload();
        URL.revokeObjectURL(currentUrl);
        currentSound = null;
        currentSoundID = null;
        currentUrl = null;
    }
}

//play
function doPlay(sample) {
    clearError();

    //if sample is loaded
    if (currentSoundID === sample.soundID) {
        if (!currentSound.playing()) {
            currentSound.play();
        }
        return;
    }

    //if sample isnt loaded already, it stops any previous sound from playing then plays this one
    unloadCurrentSound();

    let format = "wav";//there was an error previously b/c howler cant use blob type, only file ending
    if (sample.filename.toLowerCase().endsWith(".mp3")) {
        format = "mp3";
    }

    //create howler sound object then play it using howler
    currentUrl = URL.createObjectURL(sample.blob);
    currentSoundID = sample.soundID;
    currentSound = new Howl({
        src: [currentUrl],
        format: [format],
        onloaderror: function () {
            showError(sample.filename + " couldn't be played.");
            unloadCurrentSound();
        }
    });
    currentSound.play();
}

//pause sample (only if sound playing)
function doPause(sample) {
    if (currentSoundID === sample.soundID && currentSound.playing()) {
        currentSound.pause();
    }
}

//reset sample (no matter what point samaple is at, go back to start)
function doReset(sample) {
    if (currentSoundID === sample.soundID) {
        currentSound.stop();
    }
}

//download sample
function doDownload(soundID) {
    getSample(soundID, function (sample) {
        if (sample === undefined) {
            showError("sample not found for download")
            return;
        }
        //creates an entirely new download link that uses the same filea name
        const url = URL.createObjectURL(sample.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = sample.filename;

        // trigger the download then remove the temporary address a second later
        link.click();
        setTimeout(function () {
            URL.revokeObjectURL(url)
        }, 1000);
    });
}