using System.Collections.Specialized;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace ClientPuzzle.Models
{
    /// <summary>
    /// Processes requests using Client Puzzle Protocol.
    /// </summary>
    public class ClientPuzzleProcessor
    {
        /// <summary>
        /// Strength of puzzle in bits, default is 16.
        /// </summary>
        private const int PuzzleStrength = 16;

        /// <summary>
        /// Time limit to solve puzzle on client in seconds.
        /// </summary>
        private const int TimeLimit = 5;

        /// <summary>
        /// Retrieves current Unix Time Seconds (seconds from epoch).
        /// </summary>
        private long StartUnixTimeInSeconds => DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        /// <summary>
        /// Secret known only to application.
        /// </summary>
        private static byte[] secret = new byte[60];

        /// <summary>
        /// Static Constructor to initialize secret.
        /// </summary>
        static ClientPuzzleProcessor()
        {
            secret = CreateRandomSecret(60);
        }

        /// <summary>
        /// Constructor.
        /// </summary>
        public ClientPuzzleProcessor()
        {

        }

        /// <summary>
        /// Creates a random secret.
        /// </summary>
        /// <remarks>Ensure your webservice uses the same secret on all servers, e.g. by using a KeyVault.</remarks>
        /// <param name="length">Length of secret in bytes.</param>
        /// <returns></returns>
        public static byte[] CreateRandomSecret(int length)
        {
            byte[] result = new byte[length];
            Random random = new Random();
            random.NextBytes(result);

            return result;
        }

        /// <summary>
        /// Creates a new Puzzle.
        /// </summary>
        /// <param name="queryString">Query string of current request to protect.</param>
        /// <returns>A new Client Puzzle.</returns>
        public ClientPuzzle ComputePuzzle(NameValueCollection queryString)
        {
            if (PuzzleStrength == 0)
            {
                return new ClientPuzzle(string.Empty, string.Empty, 0, StartUnixTimeInSeconds);
            }

            ClientPuzzle puzzle = ExtractPuzzleFromQueryParameters(queryString);
            var hash1 = SHA256.Create();
            var hash2 = SHA256.Create();

            puzzle.StartUnixTimeInSeconds = StartUnixTimeInSeconds;
            puzzle.Secret = secret;

            string valueToHash = JsonSerializer.Serialize(puzzle);
            byte[] valueToHashByteArray = Encoding.ASCII.GetBytes(valueToHash);

            // first hash (h1) -- this is what the client needs to derive
            byte[] h1ByteArray = hash1.ComputeHash(valueToHashByteArray);
            string h1 = BitConverter.ToString(h1ByteArray).Replace("-", "").ToLower();

            // we remove some of the bits from  h1  -- this is what we give the client
            int indexLastByte = (int)(h1.Length - Math.Floor((double)PuzzleStrength / 4) - 1);
            string puzzleToSolve = h1.Substring(0, indexLastByte);

            // we need to mask out some of the bits of the last character
            string lastCharOfPuzzleString = h1.Substring(indexLastByte, 1);
            int lastCharOfPuzzle = Convert.ToInt32(lastCharOfPuzzleString, 16);
            int bitsToMask = PuzzleStrength % 4;
            var maskedLastCharOfPuzzle = lastCharOfPuzzle & ~((1 << bitsToMask) - 1);
            puzzleToSolve = puzzleToSolve + maskedLastCharOfPuzzle.ToString("X");

            // second hash -- this is the target client used to check if he derived h1 correctly
            byte[] h1HexByteArray = Encoding.ASCII.GetBytes(h1);
            byte[] h2ByteArray = hash2.ComputeHash(h1HexByteArray);
            string h2 = BitConverter.ToString(h2ByteArray).Replace("-", string.Empty).ToLower();

            return new ClientPuzzle(
                puzzleToSolve.ToLower(),
                h2.ToLower(),
                PuzzleStrength,
                puzzle.StartUnixTimeInSeconds); // reference puzzle.StartUnitTimeInSeconds
        }

        /// <summary>
        /// Checks whether puzzle is solved.
        /// </summary>
        /// <param name="queryString">Query string of current request to protect.</param>
        /// <returns>State of the solution.</returns>
        public SolutionState CheckPuzzleSolution(NameValueCollection queryString)
        {
            if (PuzzleStrength == 0)
            {
                return SolutionState.Solved;
            }

            ClientPuzzle puzzle = ExtractPuzzleFromQueryParameters(queryString);
            string claimedSolution = puzzle.Solution!;
            if (string.IsNullOrWhiteSpace(claimedSolution))
            {
                return SolutionState.NotSolved;
            }
            else if (puzzle.StartUnixTimeInSeconds + TimeLimit < StartUnixTimeInSeconds)
            {
                return SolutionState.Expired;
            }

            var hash1 = SHA256.Create();

            puzzle.Secret = secret;
            puzzle.Solution = string.Empty;

            string valueToHash = JsonSerializer.Serialize(puzzle);
            byte[] valueToHashByteArray = Encoding.ASCII.GetBytes(valueToHash);

            // first hash (h1) -- this is what the client needs to derive
            byte[] h1ByteArray = hash1.ComputeHash(valueToHashByteArray);
            string h1 = BitConverter.ToString(h1ByteArray).Replace("-", string.Empty).ToLower();

            return string.Equals(h1, claimedSolution, StringComparison.InvariantCultureIgnoreCase)
                ? SolutionState.Solved
                : SolutionState.Incorrect;
        }

        /// <summary>
        /// Extracts puzzle from query parameters.
        /// </summary>
        /// <param name="queryParameters">Query parameters to extract puzzle from.</param>
        /// <returns>ClientPuzzle extracted from query parameters.</returns>
        private ClientPuzzle ExtractPuzzleFromQueryParameters(NameValueCollection queryParameters)
        {
            long startUnixTimeInSeconds = Convert.ToInt64(queryParameters.Get("startUnixTimeInSeconds"));
            string solution = queryParameters.Get("solution") ?? string.Empty;

            queryParameters.Remove("startUnixTimeInSeconds");
            queryParameters.Remove("solution");

            ClientPuzzle puzzle = new ClientPuzzle(
                startUnixTimeInSeconds,
                solution,
                string.Join('&', queryParameters.AllKeys.Select(key => key + "=" + queryParameters.GetValues(key)![0])));
            return puzzle;
        }
    }
}
