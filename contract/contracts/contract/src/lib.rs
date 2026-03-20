#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

#[contracttype]
#[derive(Clone)]
pub struct Campaign {
    pub name: String,
    pub description: String,
    pub target: i128,
    pub total: i128,
    pub donors: u32,
    pub created: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct Donation {
    pub donor: Address,
    pub amount: i128,
}

#[contracttype]
pub enum DataKey {
    CampaignCount,
    Campaign(u64),
    Donations(u64),
    AllCampaignIds,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn create(env: Env, name: String, description: String, target: i128) -> u64 {
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::CampaignCount)
            .unwrap_or(0);
        let id = count + 1;

        let campaign = Campaign {
            name,
            description,
            target,
            total: 0,
            donors: 0,
            created: env.ledger().timestamp(),
        };

        env.storage()
            .instance()
            .set(&DataKey::Campaign(id), &campaign);
        env.storage().instance().set(&DataKey::CampaignCount, &id);
        env.storage()
            .instance()
            .set(&DataKey::Donations(id), &Vec::<Donation>::new(&env));

        let mut all_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::AllCampaignIds)
            .unwrap_or(Vec::new(&env));
        all_ids.push_back(id);
        env.storage()
            .instance()
            .set(&DataKey::AllCampaignIds, &all_ids);

        id
    }

    pub fn donate(env: Env, id: u64, donor: Address, amount: i128) {
        donor.require_auth();

        let mut campaign: Campaign = env
            .storage()
            .instance()
            .get(&DataKey::Campaign(id))
            .expect("Campaign not found");

        campaign.total += amount;
        campaign.donors += 1;
        env.storage()
            .instance()
            .set(&DataKey::Campaign(id), &campaign);

        let mut donations: Vec<Donation> = env
            .storage()
            .instance()
            .get(&DataKey::Donations(id))
            .unwrap_or(Vec::new(&env));
        donations.push_back(Donation { donor, amount });
        env.storage()
            .instance()
            .set(&DataKey::Donations(id), &donations);
    }

    pub fn get(env: Env, id: u64) -> Option<Campaign> {
        env.storage().instance().get(&DataKey::Campaign(id))
    }

    pub fn count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::CampaignCount)
            .unwrap_or(0)
    }

    pub fn get_all(env: Env) -> Vec<Campaign> {
        let ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::AllCampaignIds)
            .unwrap_or(Vec::new(&env));
        let mut campaigns = Vec::new(&env);
        for i in 0..ids.len() {
            if let Some(id) = ids.get(i) {
                if let Some(campaign) = env
                    .storage()
                    .instance()
                    .get::<_, Campaign>(&DataKey::Campaign(id))
                {
                    campaigns.push_back(campaign);
                }
            }
        }
        campaigns
    }

    pub fn get_donations(env: Env, id: u64) -> Vec<Donation> {
        env.storage()
            .instance()
            .get(&DataKey::Donations(id))
            .unwrap_or(Vec::new(&env))
    }
}

mod test;
