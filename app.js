var express = require('express');
var crypto = require('crypto');

const url = require('url');
const querystring = require('querystring');

const app = express();
const port = 5000;
const secret=crypto.randomBytes(60);
puzzle_strength=17; // default value -- this can be changed using env variable
time_limit=2000; //default time limit -- this can be changed using env variable
time = Date.now();


app.use(express.static('public'));


app.get('/', function (req, res)
{
    res.redirect(301, 'search.html');

});

function compute_puzzle( params ) {
    var hash1 = crypto.createHash('sha256');
    var hash2 = crypto.createHash('sha256');
    var timestamp = Date.now();

    // allow puzzle strength to change by environmental variable
    if (typeof process.env.puzzle_strength != 'undefined') {
        puzzle_strength = process.env.puzzle_strength;
    }
    params_with_secret_and_timestamp = params;
    params_with_secret_and_timestamp.timestamp = timestamp.toString(10);
    params_with_secret_and_timestamp.secret = secret;
    value_to_hash = JSON.stringify( params_with_secret_and_timestamp );
    // first hash -- this is what the client needs to derive
    h1 = hash1.update(value_to_hash).digest("hex");
    // we remove some of the bits from  h1  -- this is what we give the client
    var index_last_byte = h1.length - Math.floor(puzzle_strength/4) - 1;
    puzzle_to_solve = h1.substr(0, index_last_byte);
    // we need to mask out some of the bits of the last character
    var last_char_of_puzzle = parseInt("0x" + h1.substr(index_last_byte,1) );
    var bits_to_mask = puzzle_strength % 4;
    var masked_last_char_of_puzzle = last_char_of_puzzle & ~((1<<bits_to_mask)-1);
    puzzle_to_solve = puzzle_to_solve + masked_last_char_of_puzzle.toString(16);
    // second hash -- this is the target client used to check if he derived h1 correctly
    h2 = hash2.update(h1).digest("hex");
    return {"puzzle_to_solve": puzzle_to_solve, "target_hash": h2, "puzzle_strength":puzzle_strength, "timestamp": timestamp } ;
}


function check_puzzle_solution( params, claimed_solution ) {
    var hash1 = crypto.createHash('sha256');

    params_with_secret_and_timestamp = params;
    params_with_secret_and_timestamp.secret = secret;
    delete params_with_secret_and_timestamp.puzzle_solution;
    value_to_hash = JSON.stringify( params_with_secret_and_timestamp );
    // first hash -- this is what the client needs to derive
    h1 = hash1.update(value_to_hash).digest("hex");
    return h1 === claimed_solution;
}


app.get('/search', function(req, res) 
{
    var parsedUrl = url.parse(req.url);
    var parsedQs = querystring.parse(parsedUrl.query);
    time = Date.now();
    //console.log(parsedQs);
    
    // loop through the values sent in to see if there is a puzzle solution provided
    provided_puzzle_solution = undefined;
    const keys = Object.keys(parsedQs);
    for (const key of keys)
        if (key === "puzzle_solution") {
            provided_puzzle_solution = parsedQs.puzzle_solution;
            console.log( "\nClient provided following solution: " + provided_puzzle_solution );
        }
        else if (key === "timestamp") {
            start_time = parseInt(parsedQs.timestamp);
        }
    if (typeof provided_puzzle_solution != undefined && provided_puzzle_solution) {
        // solution has been provided -- check it
        var elapsed_time = time - start_time;
        console.log("Elapsed time: " + elapsed_time.toString(10) + " milliseconds");
        var valid = check_puzzle_solution( parsedQs, provided_puzzle_solution );
        // allow time_limit to change by environmental variable
        if (typeof process.env.time_limit != 'undefined')
            time_limit = process.env.time_limit;
        if (valid) {
            if (elapsed_time <= time_limit) {
                var r = { "status": "success", "message": "Puzzle has been solved!" };
                res.send(r);
            }
            else {
                var r = { "status": "failure", "message": "Puzzle has expired!" };
                res.send(r);
            }
        }
        else {
            // invalid puzzle solution provided
            challenge = compute_puzzle( parsedQs );
            console.log("invalid puzzle solution!!!");
            res.send(challenge);
        }
    }
    else {
        // no solution provided
        start_time = time;
        challenge = compute_puzzle( parsedQs );
        console.log("The following challenge provided to client:");
        console.log(challenge);
        res.send(challenge);
    }



});

app.listen(port, function () {
  console.log('Example app listening on port ' + port + '!');
});

