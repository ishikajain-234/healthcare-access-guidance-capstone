const CONTROLLED_CATEGORIES = [
  {
    category_id: 'DEMO_ALPHA',
    display_name: 'Simulated Demo Category Alpha',
    specialty: 'Simulated Domain Alpha',
    description: 'Neutral fictional demonstration category alpha for student prototype evaluation.',
  },
  {
    category_id: 'DEMO_BETA',
    display_name: 'Simulated Demo Category Beta',
    specialty: 'Simulated Domain Beta',
    description: 'Neutral fictional demonstration category beta for student prototype evaluation.',
  },
  {
    category_id: 'DEMO_GAMMA',
    display_name: 'Simulated Demo Category Gamma',
    specialty: 'Simulated Domain Gamma',
    description: 'Neutral fictional demonstration category gamma for student prototype evaluation.',
  },
  {
    category_id: 'NO_MATCH_DEMO',
    display_name: 'Simulated Unmatched Category Demo',
    specialty: 'Simulated Unmatched Domain',
    description: 'Fictional category configured to test the prototype data-limitation recovery path.',
  },
];

const VALID_CATEGORY_IDS = CONTROLLED_CATEGORIES.map((c) => c.category_id);

module.exports = {
  CONTROLLED_CATEGORIES,
  VALID_CATEGORY_IDS,
};
