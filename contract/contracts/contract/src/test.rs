#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};

#[test]
fn test_create_campaign() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let id = client.create(
        &String::from_str(&env, "Help Flood Victims"),
        &String::from_str(&env, "Emergency relief for flood victims"),
        &1000000000i128,
    );
    assert_eq!(id, 1);
    assert_eq!(client.count(), 1);

    let campaign = client.get(&1);
    assert!(campaign.is_some());
    let c = campaign.unwrap();
    assert_eq!(c.name, String::from_str(&env, "Help Flood Victims"));
    assert_eq!(
        c.description,
        String::from_str(&env, "Emergency relief for flood victims")
    );
    assert_eq!(c.target, 1000000000i128);
    assert_eq!(c.total, 0);
    assert_eq!(c.donors, 0);
}

#[test]
fn test_donate() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.create(
        &String::from_str(&env, "School Books"),
        &String::from_str(&env, "Books for underprivileged kids"),
        &500000000i128,
    );

    let donor = Address::generate(&env);
    client.donate(&1, &donor, &50000000i128);

    let campaign = client.get(&1).unwrap();
    assert_eq!(campaign.total, 50000000i128);
    assert_eq!(campaign.donors, 1);
}

#[test]
fn test_multiple_donors_same_campaign() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.create(
        &String::from_str(&env, "Clean Water"),
        &String::from_str(&env, "Build wells in Africa"),
        &10000000000i128,
    );

    let d1 = Address::generate(&env);
    let d2 = Address::generate(&env);
    let d3 = Address::generate(&env);

    client.donate(&1, &d1, &100000000i128);
    client.donate(&1, &d2, &200000000i128);
    client.donate(&1, &d3, &50000000i128);

    let campaign = client.get(&1).unwrap();
    assert_eq!(campaign.total, 350000000i128);
    assert_eq!(campaign.donors, 3);
}

#[test]
fn test_get_donations_for_campaign() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.create(
        &String::from_str(&env, "Medical Aid"),
        &String::from_str(&env, "Help for hospital"),
        &5000000000i128,
    );

    let d1 = Address::generate(&env);
    let d2 = Address::generate(&env);

    client.donate(&1, &d1, &100000000i128);
    client.donate(&1, &d2, &250000000i128);

    let donations = client.get_donations(&1);
    assert_eq!(donations.len(), 2);
}

#[test]
fn test_multiple_campaigns() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let id1 = client.create(
        &String::from_str(&env, "Campaign 1"),
        &String::from_str(&env, "First campaign"),
        &1000i128,
    );
    let id2 = client.create(
        &String::from_str(&env, "Campaign 2"),
        &String::from_str(&env, "Second campaign"),
        &2000i128,
    );

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
    assert_eq!(client.count(), 2);

    let donor = Address::generate(&env);
    client.donate(&1, &donor, &100i128);

    let c1 = client.get(&1).unwrap();
    let c2 = client.get(&2).unwrap();
    assert_eq!(c1.total, 100i128);
    assert_eq!(c2.total, 0);
}

#[test]
fn test_get_all_campaigns() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.create(
        &String::from_str(&env, "Campaign A"),
        &String::from_str(&env, "Description A"),
        &1000i128,
    );
    client.create(
        &String::from_str(&env, "Campaign B"),
        &String::from_str(&env, "Description B"),
        &2000i128,
    );
    client.create(
        &String::from_str(&env, "Campaign C"),
        &String::from_str(&env, "Description C"),
        &3000i128,
    );

    let campaigns = client.get_all();
    assert_eq!(campaigns.len(), 3);
}

#[test]
fn test_donation_not_found_campaign() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let campaign = client.get(&999);
    assert!(campaign.is_none());
}

#[test]
fn test_empty_donations() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.create(
        &String::from_str(&env, "New Campaign"),
        &String::from_str(&env, "No donations yet"),
        &1000000i128,
    );

    let donations = client.get_donations(&1);
    assert_eq!(donations.len(), 0);
}

#[test]
fn test_donation_amount_updates() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.create(
        &String::from_str(&env, "Growing Campaign"),
        &String::from_str(&env, "Should grow over time"),
        &10000000000i128,
    );

    let d1 = Address::generate(&env);
    let d2 = Address::generate(&env);

    // First donation
    client.donate(&1, &d1, &500000000i128);
    let campaign_after_first = client.get(&1).unwrap();
    assert_eq!(campaign_after_first.total, 500000000i128);
    assert_eq!(campaign_after_first.donors, 1);

    // Second donation
    client.donate(&1, &d2, &750000000i128);
    let campaign_after_second = client.get(&1).unwrap();
    assert_eq!(campaign_after_second.total, 1250000000i128);
    assert_eq!(campaign_after_second.donors, 2);

    // Verify all donations are tracked
    let all_donations = client.get_donations(&1);
    assert_eq!(all_donations.len(), 2);
}
