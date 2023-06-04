using ClientPuzzle.Models;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Collections.Specialized;

namespace ClientPuzzle.Pages
{
    /// <summary>
    /// ViewModel that provides interaction with forms on the page.
    /// </summary>
    public class IndexModel : PageModel
    {
        /// <summary>
        /// Target solution clients need to find.
        /// </summary>
        public string? TargetHash { get; set; }

        /// <summary>
        /// Puzzle clients need to solve.
        /// </summary>
        public string? PuzzleToSolve { get; set; }

        /// <summary>
        /// Secret known only to application.
        /// </summary>
        public int PuzzleStrength { get; set; }

        /// <summary>
        /// Current Unix Time Seconds (seconds from epoch).
        /// </summary>
        public long StartUnixTimeInSeconds { get; set; }

        /// <summary>
        /// Indicates whether last solution provided was correct.
        /// </summary>
        public string? SolutionState { get; set; }

        /// <summary>
        /// GiphyUrl to display upon successful puzzle.
        /// </summary>
        public string? GiphyUrl { get; set; }

        /// <summary>
        /// Asp.NET logger
        /// </summary>

        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="logger"></param>
        public IndexModel(ILogger<IndexModel> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// GET-controller
        /// </summary>
        public void OnGet()
        {
            ClientPuzzleProcessor clientPuzzle = new ClientPuzzleProcessor();

            NameValueCollection queryParameters = RetrieveQueryParametersFromRequest();

            SolutionState solutionState = clientPuzzle.CheckPuzzleSolution(queryParameters);
            SolutionState = solutionState.ToString();

            Models.ClientPuzzle newPuzzle = clientPuzzle.ComputePuzzle(queryParameters);
            TargetHash = newPuzzle.TargetHash!;
            PuzzleToSolve = newPuzzle.Task!;
            PuzzleStrength = newPuzzle.Strength!.Value;
            StartUnixTimeInSeconds = newPuzzle.StartUnixTimeInSeconds;

            if (solutionState != Models.SolutionState.Solved)
            {
                GiphyUrl = string.Empty;
                return;
            }

            Random random = new Random();
            switch (random.Next(0, 3))
            {
                case 0:
                    GiphyUrl = "https://media2.giphy.com/media/3o6YfT6YHxfCwfyvvy/giphy.gif";
                    break;
                case 1:
                    GiphyUrl = "https://media3.giphy.com/media/LT0fzPk5V1fLJEWDMu/giphy.gif";
                    break;
                case 2:
                    GiphyUrl = "https://media2.giphy.com/media/gIfv29q3ULtqjYTR7B/giphy.gif";
                    break;
                case 3:
                    GiphyUrl = "https://media4.giphy.com/media/92ybGNsaLsfuM/giphy.gif";
                    break;
            }
        }

        /// <summary>
        /// Retrieves query parameters from request.
        /// </summary>
        /// <returns>Collection of query parameters provided through request.</returns>
        private NameValueCollection RetrieveQueryParametersFromRequest()
        {
            NameValueCollection nameValueCollection = new NameValueCollection();
            foreach (string key in HttpContext.Request.Query.Keys)
            {
                nameValueCollection.Add(key, HttpContext.Request.Query[key]);
            }

            return nameValueCollection;
        }
    }
}