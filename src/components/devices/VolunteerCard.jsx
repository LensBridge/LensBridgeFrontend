/** The steps a volunteer follows at the board, inline. */
function VolunteerCard({ steps }) {
  return (
    <div>
      <div className="text-sm font-medium text-gray-700">At the board</div>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-gray-600">
        {steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
    </div>
  );
}

export default VolunteerCard;
