from app.models import DataSourceConnection, RawImportRow
from app.models.life_data import FinanceDataReal
from app.services.ingestion.finance_imports import FinanceImportService
from app.services.ingestion.google_drive_importer import DriveFileRef


def _source(source_id: str) -> DataSourceConnection:
    return DataSourceConnection(
        source_id=source_id,
        display_name=source_id.title(),
        category="file_import",
        connected=True,
        available=True,
    )


def test_revolut_import_keeps_raw_and_cleans_spend_only(db_session):
    db_session.merge(_source("revolut"))
    db_session.commit()
    csv_text = "\n".join(
        [
            "Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance",
            "Card Payment,Current,2026-04-12 10:00:00,2026-04-12 10:00:01,Tesco,-12.34,0,GBP,COMPLETED,100",
            "Topup,Current,2026-04-12 11:00:00,2026-04-12 11:00:01,Topup,50,0,GBP,COMPLETED,150",
            "Card Payment,Current,2026-04-12 12:00:00,2026-04-12 12:00:01,Held,-5,0,GBP,REVERTED,150",
        ]
    )

    result = FinanceImportService().import_csv_text(
        "revolut",
        DriveFileRef(source_id="revolut", external_file_id="rev-1", file_name="revolut.csv"),
        csv_text,
        db_session,
    )

    assert result == {"raw_rows": 3, "clean_rows": 1, "skipped_rows": 2}
    assert db_session.query(RawImportRow).filter_by(source_id="revolut").count() == 3
    clean = db_session.query(FinanceDataReal).one()
    assert clean.amount_pence == 1234
    assert clean.category == "groceries"


def test_natwest_import_skips_balance_rows(db_session):
    db_session.merge(_source("natwest"))
    db_session.commit()
    csv_text = "\n".join(
        [
            "Date,Type,Description,Value,Balance,Account Name,Account Number",
            "12 Apr 2026,POS,\"1234,TFL TRAVEL\",-3.50,96.50,Current,****1234",
            "Balance as at 13 Apr 2026,,,,96.50,Current,****1234",
        ]
    )

    result = FinanceImportService().import_csv_text(
        "natwest",
        DriveFileRef(source_id="natwest", external_file_id="nw-1", file_name="natwest.csv"),
        csv_text,
        db_session,
    )

    assert result == {"raw_rows": 2, "clean_rows": 1, "skipped_rows": 1}
    clean = db_session.query(FinanceDataReal).one()
    assert clean.amount_pence == 350
    assert clean.category == "transport"
