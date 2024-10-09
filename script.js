const nav = document.querySelector('#main');
const iconma = document.querySelector('#icon');
const body = document.body
const system = document.getElementById('system-button')
const light = document.getElementById('light-button')
const dark = document.getElementById('dark-button')


iconma.addEventListener('click', function() {
    nav.classList.toggle('active')
});



system.addEventListener('click', () => setTheme('system'))
light.addEventListener('click', () => setTheme('light'))
dark.addEventListener('click', () => setTheme('dark'))

const availableThemes = ['system', 'light', 'dark']

function setTheme(themeToSet){
    if(!availableThemes.includes(themeToSet)) return
    window.localStorage.setItem('theme', themeToSet)
    availableThemes.forEach((theme) => {
        body.classList.remove(theme);
    });
    body.classList.add(themeToSet);
}

function delectSystemTheme() {
    if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

function loadTheme() {
    const storedTheme = window.localStorage.getItem('theme');
    const theme = storedTheme || delectSystemTheme();
    setTheme(theme);
}
loadTheme();

function toggleModal() {
    const modal = document.getElementById('donation-modal');
    modal.classList.toggle('hidden')
}

const apiKey = 'AIzaSyCOhhJp4IxGziv2NSuVnkg8HdJlltEvM9g';
const searchEngineId = '729c805d075334c18';

let nextPageToken = null;
let allResults = [];
let userFeedback = {};

document.addEventListener('DOMContentLoaded', () => {
    const storedResults = JSON.parse(localStorage.getItem('searchResults'));
    const storedQuery = localStorage.getItem('lastQuery');
    if (storedResults && storedQuery) {
        document.getElementById('searchQuery').value = storedQuery;
        allResults = storedResults;
        displayResults(allResults);
    }
});

let debounceTimer;
document.getElementById('searchQuery').addEventListener('keyup', function(e){
    const query = e.target.value.trim();
    if(debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            if(query){
                searchInternet(query);
            }else{
                displayResults(allResults);
            }
        }, 300)
    });

document.getElementById('searchEngine').addEventListener('submit', function(e) {
    e.preventDefault();
    const query = document.getElementById('searchQuery').value;
    if (!query) {
        alert('Please enter a search term');
        return;
    }
    searchInternet(query);
    document.getElementById('searchQuery').value = '';
});

async function searchInternet(query) {
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`;


    try {
        const response = await fetch(searchUrl);
        const data = await response.json();

        allResults = data.items.map(item => ({ ...item, likes: 0, dislikes: 0 }));
        localStorage.setItem('searchResults', JSON.stringify(allResults));
        localStorage.setItem('lastQuery', query);
        const classifiedResults = applyMachineLearning(allResults);
        displayResults(classifiedResults);
        nextPageToken = data.queries?.nextPage ? data.queries.nextPage[0].startIndex : null;
    } catch (error) {
        console.log('Error fetching search results:', error);
        alert('Error fetching results. please try again later.');
    }
}

function applyMachineLearning(results) {
    return results.map(result => {
        const classification = classify(result);
        return {
            ...result,
            classification,
        };
    });
}

function classify(result) {
    const quality = result.snippet.length;
    const likes = result.likes;
    const dislikes = result.dislikes;
    let qualityScore = quality > 100 ? 1 : 0;
    let likeScore = likes > dislikes ? 1 : 0;
    let interactionScore = likes + dislikes > 20 ? 1 : 0; 
    let classificationCode = (qualityScore << 2) | (likeScore << 1) | interactionScore;
    switch (classificationCode) {
        case 0b111:
            return 'High Quality with Strong Engagement';
        case 0b110:
            return 'High Quality but Low Engagement';
        case 0b101:
            return 'Medium Quality with Strong Likes';
        case 0b011:
            return 'Low Quality but Popular';
        case 0b001:
            return 'Low Quality, Poor Likes';
        default:
            return 'Low Quality and Low Engagement';
    }
}

// Enhanced feedback collection using binary decisions
function collectFeedback(link, feedback) {
    const result = allResults.find(item => item.link === link);
    if (result) {
        const userFeedbackLikeKey = `${link}-like`;
        const userFeedbackDislikeKey = `${link}-dislike`;

        // Binary decision-making based on user's previous actions
        let likeDecision = userFeedback[userFeedbackLikeKey] ? 1 : 0;
        let dislikeDecision = userFeedback[userFeedbackDislikeKey] ? 1 : 0;

        // Feedback is based on the current state of likes and dislikes
        if (feedback === 'like') {
            if (likeDecision) {
                result.likes -= 1; // Undo like
                delete userFeedback[userFeedbackLikeKey];
            } else {
                result.likes += 1; // Add like
                userFeedback[userFeedbackLikeKey] = true;
                if (dislikeDecision) {
                    result.dislikes -= 1; // Remove dislike if it exists
                    delete userFeedback[userFeedbackDislikeKey];
                }
            }
        } else if (feedback === 'dislike') {
            if (dislikeDecision) {
                result.dislikes -= 1; // Undo dislike
                delete userFeedback[userFeedbackDislikeKey];
            } else {
                result.dislikes += 1; // Add dislike
                userFeedback[userFeedbackDislikeKey] = true;
                if (likeDecision) {
                    result.likes -= 1; // Remove like if it exists
                    delete userFeedback[userFeedbackLikeKey];
                }
            }
        }

        // Save the updated feedback and re-display results
        localStorage.setItem('searchResults', JSON.stringify(allResults));
        displayResults(allResults);
    }
}

function trainModel(data) {
    console.log('Training model with data:', data);
}

function displayResults(results) {
    const searchResultsDiv = document.getElementById('searchResults');

    searchResultsDiv.innerHTML = ''; 

    if (!results || results.length === 0) {
        searchResultsDiv.innerHTML = '<p>No results found.</p>';
        return;
    }

    results.forEach(result => {
        const resultDiv = document.createElement('div');
        resultDiv.classList.add('mb-5');

        const link = result.link; 
        const title = result.title;
        const snippet = result.snippet;
        const classification = result.classification;
        const likes = result.likes;
        const dislikes = result.dislikes;


        let logoUrl = '';
        if(result.pagemap && result.pagemap.cse_image && result.pagemap.cse_image.length > 0) {
            logoUrl = result.pagemap.cse_image[0].src;
        }

        resultDiv.innerHTML = `
            <div className="content">
                <div class='future'>
                <div className="im">
                ${logoUrl ? 
                    `<img src="${logoUrl}" id='ima' alt="Website logo" class='h-[100px] w-[150px] object-cover mb-4'
                    onerror="this.onerror=null;this.src='/path/to/placeholder.png';" />` : ''
                }
                </div>
                    <h3 class='text-xl font-bold'>${title} - <span class="text-sm">${classification}</span></h3>
                    <a href='${link}' class='ancrp' rel="noopener noreferrer">${link}</a>
                    <p>${snippet}</p> <!-- Description here -->
                    <p>Likes: ${likes} | Dislikes: ${dislikes}</p> <!-- Show like and dislike counts -->
                    <div class="lidis">
                    <button class='icon' onclick="collectFeedback('${link}', 'like')"><i class="fa-regular fa-thumbs-up unselectable"></i></button>
                    <button class='icon' onclick="collectFeedback('${link}', 'dislike')"><i class="fa-regular fa-thumbs-down unselectable"></i></button>
                    </div>
                </div>
            </div>
        `;

        searchResultsDiv.appendChild(resultDiv);
    });
}



document.getElementById('loadMoreBtn').addEventListener('click', function() {
    if (nextPageToken) {
        searchInternet(document.getElementById('searchQuery').value);
    }
});


