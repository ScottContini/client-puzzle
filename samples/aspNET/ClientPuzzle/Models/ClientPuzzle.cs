namespace ClientPuzzle.Models
{
	/// <summary>
	/// A Client Puzzle to be solved by client device before service processes request.
	/// </summary>
	[Serializable]
	public class ClientPuzzle
	{
		/// <summary>
		/// Puzzle clients need to solve.
		/// </summary>
		public string Task { get; set; } = string.Empty;

		/// <summary>
		/// Target solution clients need to find.
		/// </summary>
		public string TargetHash { get; set; } = string.Empty;

		/// <summary>
		/// Strength of the puzzle to solve.
		/// </summary>
		public int? Strength { get; set; } = null;

		/// <summary>
		/// Timestamp when the puzzle got started in UnixTimeSeconds.
		/// </summary>
		public long StartUnixTimeInSeconds { get; set; } = 0;

		/// <summary>
		/// Query string of the request
		/// </summary>
		public string QueryString { get; set; } = string.Empty;

		/// <summary>
		/// Server secret 60 bytes.
		/// </summary>
		public byte[]? Secret { get; set; } = null;

		/// <summary>
		/// Puzzle solution, set by client
		/// </summary>
		public string Solution { get; set; } = string.Empty;

		/// <summary>
		/// Constructor.
		/// </summary>
		/// <param name="task">Puzzle to solve.</param>
		/// <param name="targetHash">Hash to reach.</param>
		/// <param name="strength">Strength of the puzzle to solve.</param>
		/// <param name="startUnixTimeInSeconds">Timestamp when the puzzle got started, in UnixTimeSeconds.</param>
		public ClientPuzzle(string task, string targetHash, int strength, long startUnixTimeInSeconds)
		{
			Task = task;
			TargetHash = targetHash;
			Strength = strength;
			StartUnixTimeInSeconds = startUnixTimeInSeconds;
		}

		/// <summary>
		/// Constructor.
		/// </summary>
		/// <param name="startUnixTimeInSeconds">Timestamp when the puzzle got started, in UnixTimeSeconds.</param>
		/// <param name="solution">The solution provided by client</param>
		/// <param name="queryString">Query string of the request.</param>

		public ClientPuzzle(long startUnixTimeInSeconds, string solution, string queryString)
		{
			StartUnixTimeInSeconds = startUnixTimeInSeconds;
			Solution = solution;
			QueryString = queryString;
		}
	}
}
