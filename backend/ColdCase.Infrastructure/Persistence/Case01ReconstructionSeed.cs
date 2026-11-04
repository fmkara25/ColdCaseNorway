using System.Text.Json;
using ColdCase.Application.Investigations;
using ColdCase.Domain.Investigations;
using Microsoft.EntityFrameworkCore;

namespace ColdCase.Infrastructure.Persistence;

public static class Case01ReconstructionSeed
{
    public static ReconstructionDefinition Definition() => new([
        new("driver", "Hvem kjørte bilen?", [new("erik", "Erik Halvorsen"), new("jonas", "Jonas Mikkelsen"), new("lars", "Lars Viken"), new("unknown", "Ukjent fører")]),
        new("entry", "Hvordan kom Ingrid inn i bilen?", [new("voluntary", "Hun ble med frivillig"), new("forced", "Hun ble tvunget inn"), new("unknown", "Det kan ikke vurderes")]),
        new("event", "Hva utløste hendelsen?", [new("accident", "En trafikkulykke"), new("planned", "Et planlagt angrep"), new("departure", "En frivillig avreise til Trondheim")]),
        new("concealment", "Hvorfor ble hendelsen skjult?", [new("fear", "Føreren fryktet følgene for seg selv"), new("planned", "Det var del av en planlagt bortføring"), new("none", "Det var ingen hendelse å skjule")]),
        new("location", "Hvor oppsto den sentrale hendelsen?", [new("hotel", "Ved hotellet"), new("mill-road", "På Gamle Møllevei"), new("station", "På bensinstasjonen")])
    ], new() { ["driver"] = "lars", ["entry"] = "voluntary", ["event"] = "accident", ["concealment"] = "fear", ["location"] = "mill-road" },
        ["stage:reconstruction", "action:maria-plan", "action:jonas-call", "review:ingrid-letter", "review:lars-account"],
        [["vehicle-witness"], ["vehicle-log"], ["work-order"], ["station-receipt"], ["bumper-report"], ["clean-vehicle", "no-extra-job", "lars-slip"], ["bus-ticket", "travel-bag", "ingrid-letter"]], 9,
        ["depot", "work-site", "market", "mill-road", "hospital-turn", "mill-road", "service-area", "station", "depot"],
        44000, 2000, "market", "station", 36, 8);

    public static CaseSolution Create() => new()
    {
        CaseId = "1999-1218", DefinitionJson = JsonSerializer.Serialize(Definition(), CaseRules.Json),
        Epilogue = "I mange år ble det vurdert om Ingrid Solberg hadde forlatt Skardal av egen vilje. Hun hadde faktisk planlagt å reise. Det betyr ikke at hun kom seg av sted.\n\nRekonstruksjonen peker mot en ulykke og en avgjørende beslutning om ikke å tilkalle hjelp. Det som kunne ha blitt et rop om hjelp, ble i stedet til fortielse. Opplysningene om bilen, kjøringen, betalingen og forklaringene gir først mening når de vurderes sammen.\n\nIngrid ble ikke funnet. Det nøyaktige dødstidspunktet og hva som senere skjedde med levningene, kan ikke fastslås sikkert. Rekonstruksjonen gir en sammenhengende forklaring på natten, men tar ikke bort tapet eller besvarer alle spørsmål."
    };
    public static async Task InitializeAsync(CaseDbContext database)
    {
        if (!await database.CaseSolutions.AnyAsync(x => x.CaseId == "1999-1218")) database.CaseSolutions.Add(Create());
        await database.SaveChangesAsync();
    }
}
