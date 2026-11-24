//Data needed to create an IndexedDB instance
const db_name = "SampleLibrary";
const db_version = 1;
const store_name = "samples";
let db;

// opens database + creates it on first visit
function openDB () {
    const request = window.indexedDB.open(db_name, db_version);

    //the request should only be ran once on the first visit or if the version increases 
    request.onupgradeneeded = function (event){
        const maindb = event.target.result;

        //key path sets the primary key for the new store, autoincrement gives each sample a diff. ID
        const store = maindb.createObjectStore(store_name, {keyPath: "soundID", autoIncrement: true});

        //an index for each field, this will be very useful for searching 
        store.createIndex("soundType", "soundType");
        store.createIndex("category", "category");
        store.createIndex("genre", "genre");
        store.createIndex("key", "key");
        store.createIndex("bpm", "bpm");
    };

    //self checks to make sure that the db actually loads
    request.onsuccess = function (event) {
        db = event.target.result;
        refreshLibrary();
    }
    request.onerror = function (event) {
        showError("The database couldn't open, check that your browser doesn't block storage");
        console.log("failed to open database");
    }


}

//adds a sample, the frontend will call this after the user drags and drops
function addSample(record, finished){
    const transaction = db.transaction(store_name, "readwrite");
    const store = transaction.objectStore(store_name);
    const request = store.add(record);

    request.onsuccess = function(){
        finished();
    };

    request.onerror = function(event){
        showError("Sample did not save, try again (possible cause: full browser storage)");
        console.log("sample was not saved because " + event.target.error);
    };
}

// returns all samples, which will later be called by the frontend to display all of the samples
function getAllSamples(whenLoaded) {
    const transaction = db.transaction(store_name, "readonly");
    const store = transaction.objectStore(store_name);
    const request = store.getAll();

    request.onsuccess = function () {
        whenLoaded(request.result);
    };

    request.onerror = function (event) {
        showError("Samples couldn't load, try reloading the page");
        console.log("Samples could not be loaded because ", event.target.error);
    };
}

//gets a sample by its id in teh database
function getSample(soundID, whenFound) {
    const transaction = db.transaction(store_name, "readonly");
    const store = transaction.objectStore(store_name);
    const request = store.get(soundID);

    request.onsuccess = function () {
        whenFound(request.result);
    };

    request.onerror = function (event) {
        showError("the sample couldn't be loaded, try reloading the page");
        console.log("sample could not be loaded because ", event.target.error);
    };
}

//changes data of sample (this will be used w edit button )
function updateSample(record, finished) {
    const transaction = db.transaction(store_name, "readwrite");
    const store = transaction.objectStore(store_name);
    const request = store.put(record);

    request.onsuccess = function () {
        finished();
    };

    request.onerror = function (event) {
        showError("your changes couldn't be saved, try again");
        console.log("sample could not be updated because ", event.target.error);
    };
}

openDB();