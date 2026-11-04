using ColdCase.Domain.Cases;
using Microsoft.EntityFrameworkCore;

namespace ColdCase.Infrastructure.Persistence;

public static class OpeningEvidenceSeed
{
    public static async Task InitializeAsync(CaseDbContext database)
    {
        var records = new Evidence[]
        {
            new() { Id = "initial-report", DisplayOrder = 1, Title = "Savnetmelding", Kind = "Politirapport", Source = "Saksarkiv · 1999-1218", Body = "Ingrid Solberg, 23 år, er savnet fra Skardal. Hun arbeidet i resepsjonen på Skardal Hotel. Hun ble sist sett kvelden 18. desember 1999.\n\nDet forelå opplysninger om en bussbillett til Trondheim. Den opprinnelige etterforskningen vurderte om hun hadde reist frivillig. Hva som faktisk skjedde etter at hun forlot hotellet, er ikke avklart." },
            new() { Id = "bus-ticket", DisplayOrder = 2, Title = "Bussbillett til Trondheim", Kind = "Reisedokument", Source = "Billett og kontrollopplysninger", Body = "SKARDAL → TRONDHEIM\n18. desember 1999\nAvgang: kl. 22.45\n\nBilletten ble ikke brukt. Det finnes ingen bekreftelse på at Ingrid gikk om bord.\n\nEn kjøpt billett viser en planlagt reise. Den dokumenterer ikke at reisen ble gjennomført." },
            new() { Id = "phone-log", DisplayOrder = 3, Title = "Samtalen kl. 21.47", Kind = "Telefonopplysninger", Source = "Samtalelogg i saksarkivet", Body = "18. desember 1999\nTidspunkt: kl. 21.47\nVarighet: omtrent fire minutter\n\nEn telefonsamtale knyttet til Ingrid er registrert. Motparten er ikke navngitt i denne oversikten. Selve innholdet i samtalen fremgår ikke av loggen." },
            new() { Id = "market-witness", DisplayOrder = 4, Title = "Observasjonen ved butikken", Kind = "Vitneforklaring", Source = "Utdrag fra den opprinnelige etterforskningen", Body = "Et vitne opplyste å ha sett Ingrid i nærheten av butikken omtrent kl. 22.11 den 18. desember.\n\nTidspunktet er et anslag. Observasjonen plasserer henne i Skardal etter at hun hadde forlatt hotellet, men forklarer ikke hvor hun gikk videre." },
            new() { Id = "jonas-statement", DisplayOrder = 5, Title = "Jonas: den siste kontakten", Kind = "Forklaring fra 1999", Source = "Jonas Mikkelsen · arkivutdrag", Body = "Jonas Mikkelsen forklarte at han ikke hadde hatt kontakt med Ingrid etter omtrent kl. 18.00 den aktuelle kvelden.\n\nOpplysningen er gjengitt fra forklaringen hans. Den er ikke i seg selv en bekreftelse på at kontakten faktisk opphørte på dette tidspunktet." },
            new() { Id = "maria-statement", DisplayOrder = 6, Title = "Maria: planene videre", Kind = "Forklaring fra 1999", Source = "Maria Nygård · arkivutdrag", Body = "Maria Nygård oppga innledningsvis at hun ikke kjente til Ingrids plan om å reise til Trondheim.\n\nDette er hennes opprinnelige forklaring. Den må sammenholdes med andre opplysninger før det trekkes en konklusjon om hva Ingrid hadde planlagt." }
        };
        foreach (var record in records)
        {
            if (await database.Evidence.AnyAsync(x => x.CaseId == "1999-1218" && x.Id == record.Id)) continue;
            record.CaseId = "1999-1218";
            record.IsInitiallyVisible = true;
            database.Evidence.Add(record);
        }
        await database.SaveChangesAsync();
    }
}
