import gd from 'gd.js';

const gdClient = new gd();

/**
 * Fetches detailed level information, specifically the description, using a known level ID.
 * @param {string} levelId The ID of the Geometry Dash level.
 * @returns {Promise<string>} The description of the level, or an empty string if not found.
 */
async function fetchLevelDescriptionById(levelId) {
    console.log(`Fetching description for level ID: ${levelId} using gd.js...`);
    
    try {
        const detailedLevel = await gdClient.levels.get(levelId);
        
        if (detailedLevel) {
            let description = detailedLevel.description || '';
            console.log(`Description retrieved for ID ${levelId}. Length: ${description.length}`);
            return description;
        } else {
            console.log(`No detailed level data found for ID: ${levelId}`);
            return '';
        }
    } catch (error) {
        console.error(`Error fetching description for ID ${levelId}:`, error.message);
        return '';
    } finally {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Rate limit delay
    }
}

/**
 * Searches for a level ID by its name and creator.
 * @param {string} name The name of the level.
 * @param {string} creator The name of the creator.
 * @returns {Promise<string|null>} The level ID or null if not found.
 */
async function fetchLevelIdByNameAndCreator(name, creator) {
    console.log(`Searching for level ID for '${name}' by '${creator}'...`);
    try {
        const searchResults = await gdClient.levels.search({
            str: name,
            type: '2', 
            diff: '-1', 
        });

        // The Fix: Check if searchResults is an array, if not, access the `results` property
        const levels = Array.isArray(searchResults) ? searchResults : searchResults.results;

        if (!levels || levels.length === 0) {
            console.warn(`No search results found for '${name}'.`);
            return null;
        }

        const foundLevel = levels.find(level => 
            level.name.toLowerCase() === name.toLowerCase() && 
            level.creator.toLowerCase() === creator.toLowerCase()
        );

        if (foundLevel) {
            console.log(`Found level ID ${foundLevel.id} for '${name}'.`);
            return foundLevel.id;
        } else {
            console.warn(`Could not find a matching level ID for '${name}'.`);
            return null;
        }
    } catch (error) {
        console.error(`Error searching for level '${name}':`, error.message);
        return null;
    } finally {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Rate limit delay
    }
}

/**
 * Adds 'description' and 'levelId' to each level entry in the provided JSON data.
 * @param {Array<Object>} data A list of dictionaries, where each dictionary represents a level.
 * @returns {Promise<Array<Object>>} The updated list of dictionaries with 'description' and 'levelId' added.
 */
async function autofillDescriptionsAndIds(data) {
    const updatedData = [];
    for (const levelEntry of data) {
        const updatedLevelEntry = { ...levelEntry }; 
        const name = updatedLevelEntry.name;
        let levelId = updatedLevelEntry.LevelId;
        let currentDescription = updatedLevelEntry.description; 

        if (!levelId) {
            console.log(`Missing LevelId for '${name}'. Attempting to find it...`);
            levelId = await fetchLevelIdByNameAndCreator(name, updatedLevelEntry.creator);
            updatedLevelEntry.LevelId = levelId;
        }

        if (levelId && !currentDescription) {
            const newDescription = await fetchLevelDescriptionById(levelId);
            updatedLevelEntry.description = newDescription;
        } else if (levelId && currentDescription) {
            console.log(`Description already exists for '${name}' (ID: ${levelId}). Skipping API call.`);
        } else {
            console.warn(`Skipping description autofill for '${name}' due to missing LevelId.`);
        }
        updatedData.push(updatedLevelEntry);
    }
    return updatedData;
}

const jsonData = [
    { "placement": 1, "name": "Diamonds For Dashers", "creator": "yunotyou", "verifier": "엔지", "thumbnail": "", "videoId": "yU0Nzf8lnTU", "records": [], "description": "", "LevelId": "" },
    { "placement": 2, "name": "CONVOLUTION", "creator": "KEaliTgeo", "verifier": "GToast", "thumbnail": "", "videoId": "bfASf1-aK2M", "records": [], "description": "", "LevelId": "" },
    { "placement": 3, "name": "glungus", "creator": "dpoopoop", "verifier": "dpoopoop", "thumbnail": "", "videoId": "a9099BQ1Suk", "records": [], "description": "", "LevelId": "" },
    { "placement": 4, "name": "Rabbit Hole", "creator": "MadisonYuko", "verifier": "Shromer ponponto", "thumbnail": "", "videoId": "2wtM1fajXMg", "records": [], "description": "", "LevelId": "" },
    { "placement": 5, "name": "Null", "creator": "RealMatter", "verifier": "", "thumbnail": "", "videoId": "YG5_j-NGP2A", "records": [], "description": "", "LevelId": "" },
    { "placement": 6, "name": "Uhm Huh", "creator": "Crerro", "verifier": "", "thumbnail": "", "videoId": "bW3CcwkWOgE", "records": [], "description": "", "LevelId": "" },
    { "placement": 7, "name": "Starlight Cyclone", "creator": "TNTking531", "verifier": "", "thumbnail": "", "videoId": "VsQN1_oo_54", "records": [], "description": "", "LevelId": "" },
    { "placement": 8, "name": "im happy 4 you", "creator": "No ob", "verifier": "", "thumbnail": "", "videoId": "rvdQE3EyG-k", "records": [], "description": "", "LevelId": "" },
    { "placement": 9, "name": "Medramint", "creator": "vLibra", "verifier": "", "thumbnail": "", "videoId": "U3A_qBbMiFo", "records": [], "description": "", "LevelId": "" },
    { "placement": 10, "name": "Trouncy Ball", "creator": "lappwv", "verifier": "", "thumbnail": "", "videoId": "n5Swb9JGRGs", "records": [], "description": "", "LevelId": "" },
    { "placement": 11, "name": "Yimu", "creator": "mariokirby1703", "verifier": "", "thumbnail": "", "videoId": "EKyhlg9U7yI", "records": [], "description": "", "LevelId": "" },
    { "placement": 12, "name": "Dead Of Night", "creator": "TMco", "verifier": "", "thumbnail": "", "videoId": "NGPjBdJUI2c", "records": [], "description": "", "LevelId": "" },
    { "placement": 13, "name": "Project BUZZKILL", "creator": "Superkobster", "verifier": "", "thumbnail": "", "videoId": "HjBLO7flVtY", "records": [], "description": "", "LevelId": "" },
    { "placement": 14, "name": "Crerro Kaizo II", "creator": "Crerro", "verifier": "", "thumbnail": "", "videoId": "lw_Q8Wz-qew", "records": [], "description": "", "LevelId": "" },
    { "placement": 15, "name": "We Forgot Everything", "creator": "FakeHATETAG", "verifier": "", "thumbnail": "", "videoId": "mGJ4zTalgrc", "records": [], "description": "", "LevelId": "" },
    { "placement": 16, "name": "Lets All Love Lain", "creator": "MadisonYuko", "verifier": "", "thumbnail": "", "videoId": "TtQKFg0scZA", "records": [], "description": "", "LevelId": "" },
    { "placement": 17, "name": "Aerios", "creator": "Orelu", "verifier": "", "thumbnail": "", "videoId": "6LVMnSiVPBI", "records": [], "description": "", "LevelId": "" },
    { "placement": 18, "name": "Ascension Tower", "creator": "Cubical7", "verifier": "", "thumbnail": "", "videoId": "TL2bid84img", "records": [], "description": "", "LevelId": "" },
    { "placement": 19, "name": "SWAP CORE", "creator": "YoStarYeahya", "verifier": "", "thumbnail": "", "videoId": "860XR4xGwYw", "records": [], "description": "", "LevelId": "" },
    { "placement": 20, "name": "Void World", "creator": "MadisonYuko", "verifier": "", "thumbnail": "", "videoId": "LpIp7gpvnic", "records": [], "description": "", "LevelId": "" },
    { "placement": 21, "name": "Intervallum", "creator": "KEaliTgeo", "verifier": "", "thumbnail": "", "videoId": "q-RMlXjOflk", "records": [], "description": "", "LevelId": "" },
    { "placement": 22, "name": "Heartbeat", "creator": "MadisonYuko", "verifier": "", "thumbnail": "", "videoId": "quycny45has", "records": [], "description": "", "LevelId": "" },
    { "placement": 23, "name": "Chaos Ball Theory", "creator": "DustyBud", "verifier": "", "thumbnail": "", "videoId": "CMs-jsgryYI", "records": [], "description": "", "LevelId": "" },
    { "placement": 24, "name": "forgotten veil", "creator": "Ultramouk", "verifier": "", "thumbnail": "", "videoId": "_fmk6xUVhOg", "records": [], "description": "", "LevelId": "" },
    { "placement": 25, "name": "Estufa", "creator": "Samamba", "verifier": "", "thumbnail": "", "videoId": "qfDtuFt5sg4", "records": [], "description": "", "LevelId": "" },
    { "placement": 26, "name": "Steelworks Bounce", "creator": "JH1235", "verifier": "", "thumbnail": "", "videoId": "faIch7_CiIY", "records": [], "description": "", "LevelId": "" },
    { "placement": 27, "name": "Fluxion", "creator": "TestFiles", "verifier": "", "thumbnail": "", "videoId": "wLHfj6NN6xE", "records": [], "description": "", "LevelId": "" },
    { "placement": 28, "name": "the guards mission", "creator": "2ItalianCats", "verifier": "", "thumbnail": "", "videoId": "Ii-36ZSbqL4", "records": [], "description": "", "LevelId": "" },
    { "placement": 29, "name": "SCORCHING LANDSCAPE", "creator": "newSakePlayS", "verifier": "", "thumbnail": "", "videoId": "zkCDFX_uqBU", "records": [], "description": "", "LevelId": "" },
    { "placement": 30, "name": "unwell", "creator": "No ob", "verifier": "", "thumbnail": "", "videoId": "35syP_fdcB0", "records": [], "description": "", "LevelId": "" },
    { "placement": 31, "name": "depth", "creator": "kwezy", "verifier": "", "thumbnail": "", "videoId": "xPDwuvDxhjM", "records": [], "description": "", "LevelId": "" },
    { "placement": 32, "name": "Free Solo", "creator": "Cejelost", "verifier": "", "thumbnail": "", "videoId": "nKPAe-7knU4", "records": [], "description": "", "LevelId": "" },
    { "placement": 33, "name": "Meisou Hanabi", "creator": "TheSac9009", "verifier": "", "thumbnail": "", "videoId": "5IfGfG2EKYE", "records": [], "description": "", "LevelId": "" },
    { "placement": 34, "name": "Crerro Kaizo I", "creator": "Crerro", "verifier": "", "thumbnail": "", "videoId": "IzONiBCzot4", "records": [], "description": "", "LevelId": "" },
    { "placement": 35, "name": "cabbit", "creator": "dpoopoop", "verifier": "", "thumbnail": "", "videoId": "XjrQPgB1NKs", "records": [], "description": "", "LevelId": "" },
    { "placement": 36, "name": "AVALANCHE", "creator": "Emariii", "verifier": "", "thumbnail": "", "videoId": "iKHT00OXEMc", "records": [], "description": "", "LevelId": "" },
    { "placement": 37, "name": "Nuclear Alarm", "creator": "GabestGD", "verifier": "", "thumbnail": "", "videoId": "rkKCyjlJlZM", "records": [], "description": "", "LevelId": "" },
    { "placement": 38, "name": "Adrenaline", "creator": "IvanCrafter026", "verifier": "", "thumbnail": "", "videoId": "Rd0X2csapCA", "records": [], "description": "", "LevelId": "" },
    { "placement": 39, "name": "ECT6 KOHTAKT", "creator": "ItzCybercube", "verifier": "", "thumbnail": "", "videoId": "V4tiItEdQhI", "records": [], "description": "", "LevelId": "" },
    { "placement": 40, "name": "CONVEYOR", "creator": "Keleru", "verifier": "", "thumbnail": "", "videoId": "xNiOtFbIZ_0", "records": [], "description": "", "LevelId": "" },
    { "placement": 41, "name": "Blocktober Casino", "creator": "DavidConcal", "verifier": "", "thumbnail": "", "videoId": "-8eJSBajxXI", "records": [], "description": "", "LevelId": "" },
    { "placement": 42, "name": "Whg3 Lv5", "creator": "FakeHATETAG", "verifier": "", "thumbnail": "", "videoId": "am31nKL_uu0", "records": [], "description": "", "LevelId": "" },
    { "placement": 43, "name": "Exaltation", "creator": "thejshadow", "verifier": "", "thumbnail": "", "videoId": "f_Y7YkXIUC4", "records": [], "description": "", "LevelId": "" },
    { "placement": 44, "name": "GetFixedBoi", "creator": "dewpidergaming", "verifier": "", "thumbnail": "", "videoId": "MdP0dMb-hB4", "records": [], "description": "", "LevelId": "" },
    { "placement": 45, "name": "Jetpack Trials", "creator": "Eefy77", "verifier": "", "thumbnail": "", "videoId": "AULFtVeM2t0", "records": [], "description": "", "LevelId": "" },
    { "placement": 46, "name": "CASIO HELLBURST", "creator": "MVXgameS", "verifier": "", "thumbnail": "", "videoId": "0KmuG004LoE", "records": [], "description": "", "LevelId": "" },
    { "placement": 47, "name": "NIGHT RUNNER", "creator": "newSakePlayS", "verifier": "", "thumbnail": "", "videoId": "loQET2ng0P4", "records": [], "description": "", "LevelId": "" },
    { "placement": 48, "name": "Happy World", "creator": "Cubical7", "verifier": "", "thumbnail": "", "videoId": "5TJvUdPjXUw", "records": [], "description": "", "LevelId": "" },
    { "placement": 49, "name": "Hidden Horizons", "creator": "Orelu", "verifier": "", "thumbnail": "", "videoId": "oOCQj_T9SBE", "records": [], "description": "", "LevelId": "" },
    { "placement": 50, "name": "The Abyss", "creator": "MadisonYuko", "verifier": "", "thumbnail": "", "videoId": "HWwURHUwvu4", "records": [], "description": "", "LevelId": "" },
    { "placement": 51, "name": "LXE", "creator": "ThiKn", "verifier": "", "thumbnail": "", "videoId": "LESwanFZxuA", "records": [], "description": "", "LevelId": "" },
    { "placement": 52, "name": "fish in the sink", "creator": "pumpkininabox", "verifier": "", "thumbnail": "", "videoId": "ChzMW70K1uA", "records": [], "description": "", "LevelId": "" },
    { "placement": 53, "name": "Life and Beauty", "creator": "No ob", "verifier": "", "thumbnail": "", "videoId": "dusKMkurEcw", "records": [], "description": "", "LevelId": "" },
    { "placement": 54, "name": "Mechanical Warehouse", "creator": "iownfish", "verifier": "", "thumbnail": "", "videoId": "UMMn-a6lOUk", "records": [], "description": "", "LevelId": "" },
    { "placement": 55, "name": "HYPER GRAVITRON", "creator": "exsii", "verifier": "", "thumbnail": "", "videoId": "og4iOb22elI", "records": [], "description": "", "LevelId": "" },
    { "placement": 56, "name": "Guidance", "creator": "ThiKn", "verifier": "", "thumbnail": "", "videoId": "y6CwaFSgjkY", "records": [], "description": "", "LevelId": "" },
    { "placement": 57, "name": "Zenith Of The Sky", "creator": "blackdashh", "verifier": "", "thumbnail": "", "videoId": "_Sj5WGVGfkE", "records": [], "description": "", "LevelId": "" },
    { "placement": 58, "name": "Ice Climbers", "creator": "Smarted", "verifier": "", "thumbnail": "", "videoId": "ehES_xRYXi8", "records": [], "description": "", "LevelId": "" },
    { "placement": 59, "name": "22 Trials of PAIN", "creator": "sink", "verifier": "", "thumbnail": "", "videoId": "We-j9VuJvVk", "records": [], "description": "", "LevelId": "" },
    { "placement": 60, "name": "i wanna rob the top", "creator": "Enlightenment", "verifier": "", "thumbnail": "", "videoId": "x7DlqrYSpsM", "records": [], "description": "", "LevelId": "" },
    { "placement": 61, "name": "HOOKIN UP WITH CUSTI", "creator": "Custi", "verifier": "", "thumbnail": "", "videoId": "dvprX8xMjl8", "records": [], "description": "", "LevelId": "" },
    { "placement": 62, "name": "Platscapes", "creator": "Xepheron", "verifier": "", "thumbnail": "", "videoId": "KLsZl7t2D7E", "records": [], "description": "", "LevelId": "" },
    { "placement": 63, "name": "The Observatory", "creator": "iownfish", "verifier": "", "thumbnail": "", "videoId": "1t7hqp8fMlg", "records": [], "description": "", "LevelId": "" },
    { "placement": 64, "name": "Hexagonestestestest", "creator": "Enlightenment", "verifier": "", "thumbnail": "", "videoId": "u_-EcWpfNy8", "records": [], "description": "", "LevelId": "" },
    { "placement": 65, "name": "ENTANGLEMENT", "creator": "TheRealXFuture", "verifier": "", "thumbnail": "", "videoId": "KFH_xIIApAM", "records": [], "description": "", "LevelId": "" },
    { "placement": 66, "name": "Aquanemesis", "creator": "vLibra", "verifier": "", "thumbnail": "", "videoId": "oxZw4vhwGFg", "records": [], "description": "", "LevelId": "" },
    { "placement": 67, "name": "Terminal Heaven", "creator": "G4lvatron", "verifier": "", "thumbnail": "", "videoId": "e3GHd6jx1es", "records": [], "description": "", "LevelId": "" },
    { "placement": 68, "name": "Tragedy in 5 acts", "creator": "Ivelll", "verifier": "", "thumbnail": "", "videoId": "D-3zPas_ut0", "records": [], "description": "", "LevelId": "" },
    { "placement": 69, "name": "FRUSTRATION", "creator": "Jeyzor", "verifier": "", "thumbnail": "", "videoId": "nAMHVOtjF_0", "records": [], "description": "", "LevelId": "" },
    { "placement": 70, "name": "stormpunk", "creator": "KingEggplant987", "verifier": "", "thumbnail": "", "videoId": "kXvUdK9j93s", "records": [], "description": "", "LevelId": "" },
    { "placement": 71, "name": "Bouncy Ball", "creator": "lappwv", "verifier": "", "thumbnail": "", "videoId": "GDIlOf4HSxI", "records": [], "description": "", "LevelId": "" },
    { "placement": 72, "name": "gallery", "creator": "2ItalianCats", "verifier": "", "thumbnail": "", "videoId": "mz_qXthmVk4", "records": [], "description": "", "LevelId": "" },
    { "placement": 73, "name": "Uh Oh", "creator": "chloechu", "verifier": "", "thumbnail": "", "videoId": "Chu2BG4NSJM", "records": [], "description": "", "LevelId": "" },
    { "placement": 74, "name": "echos du silence", "creator": "ComodoQc", "verifier": "", "thumbnail": "", "videoId": "Ssi1eyE7s8o", "records": [], "description": "", "LevelId": "" },
    { "placement": 75, "name": "Novae Project", "creator": "BGames", "verifier": "", "thumbnail": "", "videoId": "KUvfPP_gI7E", "records": [], "description": "", "LevelId": "" }
];

async function main() {
    console.log("Attempting to autofill descriptions and IDs using existing level names with gd.js...");
    const updatedJsonData = await autofillDescriptionsAndIds(jsonData);
    console.log("\n--- Updated JSON Data ---");
    console.log(JSON.stringify(updatedJsonData, null, 2));
    console.log("\nProcess complete. Please review the output.");
}

main();