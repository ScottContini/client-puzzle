# Client-Puzzle protocol

This repo gives a simple demonstration of the client-puzzle protocol
from the [publication of Ari Juels and John Brainard](https://www.arijuels.com/wp-content/uploads/2013/09/JB99.pdf).
The protocol is an effective way of slowing down robots with the goal of making them as slow as normal humans.
This can greatly impede robots from performing unwanted actions on your website.

The backend runs in Node.js.  For most amusement, provide a 
[Giphy API Key](https://support.giphy.com/hc/en-us/articles/360020283431-Request-A-GIPHY-API-Key) through the environmental variable
`giphy_api_key`.

# Running the demo
There are two samples, one for NodeJS and one for ASP.NET.

## Running the NodeJS sample
This app requires Node.js and Express.
It is desirable (but not required)  to set a 
[Giphy API Key](https://support.giphy.com/hc/en-us/articles/360020283431-Request-A-GIPHY-API-Key) through the environmental variable
`giphy_api_key`.

Run the demo  by typing `node app.js` and then open your 
favourite browser to 
[http://127.0.0.1:5000/search.html](http://127.0.0.1:5000/search.html).
Type something in the search and it will return a result from
[Giphy](https://giphy.com/) after your browser solves the client-side
puzzle.  

## Running the ASP.NET sample
Run the demo by opening the ClientPuzzle.sln solution in Visual Studio and click the Start-button. Your webbrowser will automatically open [https://localhost:7147/](https://localhost:7147/).

# More information

For more information, please see
[my blog on the client-puzzle protocol](https://littlemaninmyhead.wordpress.com/2020/09/20/fighting-bots-with-the-client-puzzle-protocol/).
