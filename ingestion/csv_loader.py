import pandas as pd


def extract_text_from_csv(file_path):

    dataframe = pd.read_csv(file_path)

    return dataframe.to_string(index=False)