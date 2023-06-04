namespace ClientPuzzle.Models
{
    /// <summary>
    /// State of Client Puzzle solution.
    /// </summary>
    public enum SolutionState
    {
        /// <summary>
        /// Client Puzzle was solved successfully.
        /// </summary>
        Solved,

        /// <summary>
        /// Client Puzzle was solved but solution expired.
        /// </summary>
        Expired,

        /// <summary>
        /// Client Puzzle was solved incorrectly.
        /// </summary>
        Incorrect,

        /// <summary>
        /// Client Puzzle was not solved.
        /// </summary>
        NotSolved,
    }
}
