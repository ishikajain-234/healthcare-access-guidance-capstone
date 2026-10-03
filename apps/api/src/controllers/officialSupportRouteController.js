class OfficialSupportRouteController {
  getSupportRoutes(req, res) {
    res.status(200).json({
      title: 'Official Information & Support Routes',
      informational_card: 'Information route shown; confirmation must occur through the relevant official process outside this prototype. Use the relevant official scheme channel or authorized hospital support desk for current information. This prototype does not determine eligibility, coverage, approval, availability, cashless treatment, or legal status.',
      disclaimer: 'Information route shown; confirmation must occur through the relevant official process outside this prototype. This prototype does not determine eligibility, coverage, approval, availability, cashless treatment, or legal status.',
      routes: [
        {
          channel_name: 'Relevant Official Scheme Channel',
          contact_type: 'INFORMATION_ONLY',
          contact_value: 'Official designated scheme portal / public helpline',
          verification_status: 'SIMULATED_DEMO_NOTICE',
          guidance: 'Refer to official published scheme channels or designated state authorities for statutory verification.'
        },
        {
          channel_name: 'Authorized Hospital Support Desk',
          contact_type: 'INFORMATION_ONLY',
          contact_value: 'Hospital Administrative Help Desk (On-site)',
          verification_status: 'SIMULATED_DEMO_NOTICE',
          guidance: 'Inquire directly at authorized hospital administrative counters regarding current procedures.'
        }
      ]
    });
  }
}

module.exports = new OfficialSupportRouteController();
