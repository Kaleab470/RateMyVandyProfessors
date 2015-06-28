/**
 * Rate My Vandy Professors
 * JavaScript file to scrape information and replace it in Class Search
 */

var timeout = null;		            // Necesssary for listener
// var names;

// Find a way to make next two variables readable
var anchorIndicator = '<div class="contextMenuItem contextMenuDivider"><div class="contextItemHeader">Active</div><div class="contextItemBody"><img src="https://i.imgur.com/Dp6UoWh.png" /></div></div>';
var modal = '<div class="detailHeader id="ratingsLabel"">Ratings</div><div class="detailPanel" id="ratings"><center>View on RateMyProfessor</center><table class="availabilityNameValueTable"><tbody><tr><td colspan="2"><div class="listDivider"></div></td></tr><tr><td class="label">Helpfulness: </td><td id="helpfulness"><img src="https://webapp.mis.vanderbilt.edu/more/images/loading.gif"></td></tr><tr><td class="label">Clarity: </td><td id="clarity"><img src="https://webapp.mis.vanderbilt.edu/more/images/loading.gif"></td></tr><tr><td class="label">Easiness: </td><td id="easiness"><img src="https://webapp.mis.vanderbilt.edu/more/images/loading.gif"></td></tr></tbody></table></div>'

// Show user that the extension is active
$("#mainContextMenu").css("width", "auto");
$("#mainContextMenu .contextMenuItem").eq(0).before(anchorIndicator);

/**
 * Every second, checks to see if AJAX executes (if page changes at all)
 * This allows the extension to update even though the URL never changes
 */
document.addEventListener("DOMSubtreeModified", function() {
    if (timeout) {
        clearTimeout(timeout);
    }
    timeout = setTimeout(update, 100);
}, false);

/**
 * This function determines the type of data to retrieve, pushes it
 */
function update() {
    getProfessorNames();
    if (document.getElementById("ratings") == null) {
        $("#rightSection").append(modal);
        var teacher = $("table.meetingPatternTable div").last().text()
        if (teacher != "" && !teacher.includes("Staff")) {
          getModalUrl(convertName(teacher));
        }
    }
}

/**
 * Gets the professor name from Class Search
 */
function getProfessorNames() {
    names = $(".classInstructor");
    for (var i = 0; i < names.length; i++) {
        if (!names[i].innerText.includes(" - ") && names[i].innerText != "" && !names[i].innerHTML.includes("<img")) {
            if (names[i].innerText.includes("Staff") || names[i].innerText.includes(" | ")) {
                names[i].innerText += " - N/A";
            } else {
                names[i].innerHTML += '<img src="https://webapp.mis.vanderbilt.edu/more/images/loading.gif">'
                searchForProfessor(i);
            }
        }
    }
}

/**
 * Emulates  the RMP search page then outputs the
 * specific ID for that professor at Vanderbilt
 */
function searchForProfessor(profIndex) {
    var profName = names[profIndex].innerText;
    chrome.runtime.sendMessage({
        action: "searchForProfessor",
        method: "POST",
        url: "http://www.ratemyprofessors.com/search.jsp?queryoption=HEADER&queryBy=teacherName&schoolName=Vanderbilt+University&schoolID=4002&query=" + convertName(profName)
    }, function(response) {
        if (response.profLink != null) {
            getOverallScore(profIndex, profName, response.profLink);
        } else {
            names[profIndex].innerText += " - N/A";
        }
    });
}

/**
 * This function changes the original name into one that can be searched
 */
function convertName(original) {
    var temp = /\w+(, )\w+/g.exec(original);
    if (temp[0].trim() in subs) {
        temp[0] = subs[temp[0].trim()];
    }
    return temp[0].replace(", ", "%2C+");
}

/**
 * This function builds on searchForProfessor visits the URL
 * and returns the overall rating for that professor
 */
function getOverallScore(profIndex, profName, profLink) {
    chrome.runtime.sendMessage({
        action: "getOverallScore",
        method: "POST",
        url: "http://www.ratemyprofessors.com" + profLink
    }, function(response) {
        if (!names[profIndex].innerText.includes(" - ")) {
            // Ignore requests with no ratings
            if (response.profRating == "0.0" || response.profRating.includes("Grade Received")) {
                names[profIndex].innerText += " - N/A";
            } else {
                names[profIndex].innerText += " - " + response.profRating;
                names[profIndex].style.color = getColor(parseInt(response.profRating));
            }
        }
    });
}

/**
 * This functiong gets the professor name from a modal window
 */
function getModalUrl(teacher) {
  chrome.runtime.sendMessage({
    action: "searchForProfessor",
    method: "POST",
    url: "http://www.ratemyprofessors.com/search.jsp?queryoption=HEADER&queryBy=teacherName&schoolName=Vanderbilt+University&schoolID=4002&query=" + teacher
  }, function(response) {
    if (response.profLink != null) {
        getOtherScores(response.profLink);
    } else {
        console.debug("There is no URL");
    }
  });
}

function getOtherScores(profLink) {
    chrome.runtime.sendMessage({
        action: "xhr",
        method: "POST",
        url: "http://www.ratemyprofessors.com" + profLink
    }, function(response) {
        var ratingPage = document.createElement("html");
        ratingPage.innerHTML = response.pageText;
        var otherScores = $(".rating-slider .rating", ratingPage).slice(0, 3);
        $("#helpfulness").text(otherScores[0].innerText);
        $("#clarity").text(otherScores[1].innerText);
        $("#easiness").text(otherScores[2].innerText);
    })
}

/**
 * This function color-codes the ratings
 */
function getColor(profRating) {
    if (profRating >= 3.5) {
        return "#27AE60";                  // Green
    } else if (profRating < 2.5) {
        return "#E74C3C";                  // Red
    } else {
        return "#FF9800";                  // Yellow
    }
}
