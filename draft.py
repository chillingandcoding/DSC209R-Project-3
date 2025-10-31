import pandas as pd

# GDP
df_gdp= pd.read_csv('./datasets/GDP_datasets/GDP.csv')

print("GDP Dataset")
print(df_gdp.head())
print("GDP Dataset Shape:", df_gdp.shape)
print(list(df_gdp.columns))

#Economy
df_ec= pd.read_csv('./datasets/economy-and-growth.csv')

print("\n Economy Dataset")
print(df_ec.head())
print("Economy Dataset Shape:", df_ec.shape)
print(list(df_ec.columns))