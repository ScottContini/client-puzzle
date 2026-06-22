/*
Copyright (c) 2026 Scott Contini

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const express = require('express');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;
const secret = crypto.randomBytes(60);

let puzzle_strength = 16;
let time_limit = 5000;

let giphy_api_key = "";
if (typeof process.env.giphy_api_key !== 'undefined')
    giphy_api_key = process.env.giphy_api_key;


app.use(express.static('public'));


async function search_giphy(search_term) {
    if (giphy_api_key === "") {
        console.log("Giphy API key is undefined");
        const rand = Math.floor((Math.random() * 4));
        const fallback_gifs = [
            "https://media2.giphy.com/media/3o6YfT6YHxfCwfyvvy/giphy.gif",
            "https://media3.giphy.com/media/LT0fzPk5V1fLJEWDMu/giphy.gif",
            "https://media2.giphy.com/media/gIfv29q3ULtqjYTR7B/giphy.gif",
            "https://media4.giphy.com/media/92ybGNsaLsfuM/giphy.gif",
        ];
        return fallback_gifs[rand];
    }

    const url = 'https://api.giphy.com/v1/gifs/random?api_key=' + encodeURIComponent(giphy_api_key) + '&tag=' + encodeURIComponent(search_term);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Giphy API returned status ' + response.status);
        }
        const r = await response.json();
        const giphy_url = r.data.image_url;
        if (giphy_url === undefined)
            return "https://media4.giphy.com/media/QzBvpfKuIVBcPmXS0R/giphy.gif";
        return giphy_url;
    } catch (error) {
        console.log("got an error!", error.message);
        return 'https://media1.giphy.com/media/3ohhwDGmpiXTv53VXW/giphy.gif';
    }
}



app.get('/', function (req, res)
{
    res.redirect(301, 'search.html');
});

function compute_puzzle(params) {
    const hash1 = crypto.createHash('sha256');
    const hash2 = crypto.createHash('sha256');
    const timestamp = Date.now();

    if (typeof process.env.puzzle_strength !== 'undefined') {
        puzzle_strength = parseInt(process.env.puzzle_strength, 10);
    }
    const params_with_secret_and_timestamp = Object.assign({}, params);
    params_with_secret_and_timestamp.timestamp = timestamp.toString(10);
    params_with_secret_and_timestamp.secret = secret;
    const value_to_hash = JSON.stringify(params_with_secret_and_timestamp);
    const h1 = hash1.update(value_to_hash).digest("hex");
    const index_last_byte = h1.length - Math.floor(puzzle_strength / 4) - 1;
    let puzzle_to_solve = h1.substr(0, index_last_byte);
    const last_char_of_puzzle = parseInt("0x" + h1.substr(index_last_byte, 1));
    const bits_to_mask = puzzle_strength % 4;
    const masked_last_char_of_puzzle = last_char_of_puzzle & ~((1 << bits_to_mask) - 1);
    puzzle_to_solve = puzzle_to_solve + masked_last_char_of_puzzle.toString(16);
    const h2 = hash2.update(h1).digest("hex");
    return { "puzzle_to_solve": puzzle_to_solve, "target_hash": h2, "puzzle_strength": puzzle_strength, "timestamp": timestamp };
}


function check_puzzle_solution(params, claimed_solution) {
    const hash1 = crypto.createHash('sha256');

    const params_with_secret_and_timestamp = Object.assign({}, params);
    params_with_secret_and_timestamp.secret = secret;
    delete params_with_secret_and_timestamp.puzzle_solution;
    const value_to_hash = JSON.stringify(params_with_secret_and_timestamp);
    const h1 = hash1.update(value_to_hash).digest("hex");
    return h1 === claimed_solution;
}


app.get('/search', async function(req, res)
{
    const parsedQs = req.query;
    let search = "";
    const time = Date.now();

    let provided_puzzle_solution = undefined;
    let start_time = time;
    const keys = Object.keys(parsedQs);
    for (const key of keys)
        if (key === "puzzle_solution") {
            provided_puzzle_solution = parsedQs.puzzle_solution;
            console.log("\nClient provided following solution: " + provided_puzzle_solution);
        }
        else if (key === "timestamp") {
            start_time = parseInt(parsedQs.timestamp);
        }
        else if (key === "search") {
            search = parsedQs.search;
        }
    if (typeof provided_puzzle_solution !== 'undefined' && provided_puzzle_solution) {
        const elapsed_time = time - start_time;
        console.log("Elapsed time: " + elapsed_time.toString(10) + " milliseconds");
        const valid = check_puzzle_solution(parsedQs, provided_puzzle_solution);
        if (typeof process.env.time_limit !== 'undefined')
            time_limit = parseInt(process.env.time_limit, 10);
        if (valid) {
            if (elapsed_time <= time_limit) {
                try {
                    const giphy_url = await search_giphy(search);
                    console.log("giphy url is " + giphy_url);
                    let r;
                    if (giphy_api_key === "")
                        r = { "status": "success", "message": "Puzzle has been solved, but no Giphy API key has been configured so sorry for the boring result", "image_url": giphy_url };
                    else
                        r = { "status": "success", "message": "Puzzle has been solved!  Image served below (Powered by Giphy).", "image_url": giphy_url };
                    console.log(r);
                    res.send(r);
                } catch (error) {
                    console.log("Error searching giphy:", error.message);
                    res.status(500).send({ "status": "error", "message": "Failed to search giphy" });
                }
            }
            else {
                const r = { "status": "failure", "message": "Puzzle has expired!" };
                res.send(r);
            }
        }
        else {
            const challenge = compute_puzzle(parsedQs);
            console.log("invalid puzzle solution!!!");
            res.send(challenge);
        }
    }
    else {
        const challenge = compute_puzzle(parsedQs);
        console.log("The following challenge provided to client:");
        console.log(challenge);
        res.send(challenge);
    }
});



app.listen(port, function () {
  console.log('Example app listening on port ' + port + '!');
});
