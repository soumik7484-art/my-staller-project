#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Map, Symbol};

// Storage keys
const DONATIONS: Symbol = symbol_short!("DONATE");

#[contract]
pub struct CharityContract;

#[contractimpl]
impl CharityContract {

    // Donate function
    pub fn donate(env: Env, donor: Address, amount: i128) {
        donor.require_auth();

        let mut donations: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DONATIONS)
            .unwrap_or(Map::new(&env));

        let current = donations.get(donor.clone()).unwrap_or(0);
        donations.set(donor, current + amount);

        env.storage().instance().set(&DONATIONS, &donations);
    }

    // Get donation amount of a user
    pub fn get_donation(env: Env, donor: Address) -> i128 {
        let donations: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DONATIONS)
            .unwrap_or(Map::new(&env));

        donations.get(donor).unwrap_or(0)
    }

    // Get total donations
    pub fn get_total(env: Env) -> i128 {
        let donations: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DONATIONS)
            .unwrap_or(Map::new(&env));

        let mut total: i128 = 0;

        for (_, amount) in donations.iter() {
            total += amount;
        }

        total
    }
}